import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-operations — 사용자 제품 등록 요청 처리 + 제품 일괄 변경.
 *
 * 두 기능 모두 service_role 이 있어야 한다. product_requests 는 anon 권한을
 * 통째로 회수해 두었고(요청 목록에는 사용자가 무엇을 찾는지가 담긴다), 일괄
 * 변경은 화면에서 숨기는 것으로 끝내면 안 되는 쓰기 작업이다.
 *
 * 인증: admin-write 와 같은 x-admin-token 규약.
 */

const ALLOWED_TOKEN_HASHES = new Set([
  '0a6a2e1f8723c72cf8e729d3ea6af059f6c6d3035b589eaf7e53f7a9f10e3f7d',
]);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://veroro-admin.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

/** 한 번에 바꿀 수 있는 제품 수. 실수로 전체를 바꾸지 못하게 한다. */
const MAX_BULK_IDS = 200;
const REQUEST_STATUSES = new Set(['pending', 'registered', 'rejected']);
const VERIFICATION_STATUSES = new Set(['pending', 'reviewed', 'verified']);

function buildCorsHeaders(req: Request): Record<string, string> {
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    Vary: 'Origin',
  };
  const raw = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '').trim();
  const allowed = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
  const origin = req.headers.get('Origin');
  if (origin && allowed.includes(origin)) return { ...base, 'Access-Control-Allow-Origin': origin };
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
}

/** 화면에 그대로 보여줄 수 있는 검증 오류. 내부 DB 오류와 구분한다. */
class ValidationError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function requireUuid(value: unknown, label: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!UUID_RE.test(s)) throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  return s;
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

/** 관리자 토큰 검증 — admin-write 와 같은 두 형태를 모두 받는다. */
async function authenticateAdmin(token: string, sessionSecret: string): Promise<string | null> {
  if (token.startsWith('v1.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(sessionSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        base64UrlDecode(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
      if (!valid) return null;
      const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as {
        actor?: unknown; exp?: unknown;
      };
      if (typeof payload.actor !== 'string' || !payload.actor || payload.actor.length > 64) return null;
      if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
      return payload.actor;
    } catch {
      return null;
    }
  }
  if (!ALLOWED_TOKEN_HASHES.has(await sha256Hex(token))) return null;
  try {
    const id = atob(token).split(':')[0]?.trim();
    return id && id.length <= 64 ? id : 'unknown';
  } catch {
    return 'unknown';
  }
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function audit(
  db: Db, actor: string, action: string, table: string,
  targetId: string | null, detail: Record<string, unknown>,
) {
  // 감사 로그 실패가 본 작업을 되돌리지 않도록 오류를 삼킨다.
  const { error } = await db.from('admin_audit_log').insert({
    actor, action, target_table: table, target_id: targetId, detail,
  });
  if (error) console.error('audit log failed:', error.message);
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: '서버 환경변수 누락' }, 500, cors);

  const sessionSecret = Deno.env.get('ADMIN_SESSION_SECRET') ?? serviceKey;
  const token = req.headers.get('x-admin-token') ?? '';
  const actor = token ? await authenticateAdmin(token, sessionSecret) : null;
  if (!actor) return json({ error: '관리자 인증 실패' }, 401, cors);

  const db: Db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';

    switch (action) {
      /** 사용자가 등록을 요청한 제품 목록. 같은 제품 요청이 몇 건인지 함께 센다. */
      case 'listProductRequests': {
        const status = optionalText(body.status, '상태', 20) ?? 'pending';
        if (status !== 'all' && !REQUEST_STATUSES.has(status)) {
          throw new ValidationError('상태 값이 올바르지 않습니다.');
        }
        const pageRaw = Number(body.page);
        const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
        const sizeRaw = Number(body.pageSize);
        const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(Math.floor(sizeRaw), 100) : 20;
        const from = (page - 1) * pageSize;

        let query = db
          .from('product_requests')
          // users 를 임베드하지 않는다 — user_id 는 auth.users 를 참조하므로
          // PostgREST 가 public.users 와의 관계를 찾지 못해 쿼리 자체가 실패한다.
          // 닉네임은 아래에서 따로 모아 붙인다.
          .select(
            'id, requested_name, search_query, product_url, note, status, created_at, '
            + 'reviewed_by, reviewed_at, review_note, user_id',
            { count: 'exact' },
          )
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (status !== 'all') query = query.eq('status', status);

        const { data, count, error } = await query;
        if (error) throw error;

        // 같은 제품을 여러 사람이 요청했는지 — 무엇부터 채울지 정하는 근거다.
        const { data: pendingAll } = await db
          .from('product_requests')
          .select('requested_name')
          .eq('status', 'pending')
          .limit(2000);
        const demand = new Map<string, number>();
        for (const row of (pendingAll ?? []) as { requested_name: string }[]) {
          const key = row.requested_name.trim().toLowerCase();
          demand.set(key, (demand.get(key) ?? 0) + 1);
        }

        // 닉네임은 별도 조회로 붙인다. 프로필 행이 없는 계정도 있어 LEFT 성격이다.
        const userIds = [...new Set(
          (data ?? []).map((row: Record<string, unknown>) => row.user_id).filter(Boolean),
        )] as string[];
        const nicknames = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await db.from('users').select('id, nickname').in('id', userIds);
          for (const row of (profiles ?? []) as { id: string; nickname: string | null }[]) {
            if (row.nickname) nicknames.set(row.id, row.nickname);
          }
        }

        return json({
          ok: true,
          total: count ?? 0,
          requests: (data ?? []).map((row: Record<string, unknown>) => {
            const name = String(row.requested_name ?? '');
            return {
              id: row.id,
              requestedName: name,
              searchQuery: row.search_query ?? null,
              productUrl: row.product_url ?? null,
              note: row.note ?? null,
              status: row.status,
              createdAt: row.created_at,
              reviewedBy: row.reviewed_by ?? null,
              reviewedAt: row.reviewed_at ?? null,
              reviewNote: row.review_note ?? null,
              nickname: nicknames.get(String(row.user_id ?? '')) ?? '알 수 없음',
              requestCount: demand.get(name.trim().toLowerCase()) ?? 1,
            };
          }),
        }, 200, cors);
      }

      /** 요청 처리 — 등록함/반려. 제품을 실제로 만드는 것은 제품 관리에서 한다. */
      case 'reviewProductRequest': {
        const id = requireUuid(body.id, '요청 ID');
        const status = optionalText(body.status, '상태', 20) ?? '';
        if (!REQUEST_STATUSES.has(status)) throw new ValidationError('상태 값이 올바르지 않습니다.');
        const note = optionalText(body.note, '처리 메모', 1000);

        const { data: updated, error } = await db
          .from('product_requests')
          .update({
            status,
            review_note: note,
            reviewed_by: actor,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('id, requested_name, status')
          .maybeSingle();
        if (error) throw error;
        if (!updated) throw new ValidationError('요청을 찾을 수 없습니다.');

        await audit(db, actor, 'reviewProductRequest', 'product_requests', id, {
          name: updated.requested_name, status,
        });
        return json({ ok: true, status }, 200, cors);
      }

      /**
       * 제품 일괄 변경 — 노출/검수 상태/카테고리.
       *
       * 실제로 몇 건이 바뀌었는지 세어서 돌려준다. 요청 수와 다르면 화면이
       * "전부 성공"으로 보여 주지 않고 차이를 알린다.
       */
      case 'bulkUpdateProducts': {
        const rawIds = Array.isArray(body.ids) ? body.ids : [];
        if (rawIds.length === 0) throw new ValidationError('선택된 제품이 없습니다.');
        if (rawIds.length > MAX_BULK_IDS) {
          throw new ValidationError(`한 번에 최대 ${MAX_BULK_IDS}개까지 변경할 수 있습니다.`);
        }
        const ids = [...new Set(rawIds.map((value) => requireUuid(value, '제품 ID')))];

        const patch: Record<string, unknown> = {};
        if (body.isVisible !== undefined) {
          if (typeof body.isVisible !== 'boolean') {
            throw new ValidationError('노출 상태는 불리언이어야 합니다.');
          }
          patch.is_visible = body.isVisible;
        }
        if (body.verificationStatus !== undefined) {
          const value = optionalText(body.verificationStatus, '검수 상태', 20) ?? '';
          if (!VERIFICATION_STATUSES.has(value)) {
            throw new ValidationError('검수 상태 값이 올바르지 않습니다.');
          }
          patch.verification_status = value;
        }
        if (body.mainCategory !== undefined) {
          patch.main_category = optionalText(body.mainCategory, '카테고리', 40);
        }
        if (Object.keys(patch).length === 0) throw new ValidationError('변경할 내용이 없습니다.');

        const { data, error } = await db
          .from('products')
          .update(patch)
          .in('id', ids)
          .select('id');
        if (error) throw error;

        const updated = (data ?? []).length;
        await audit(db, actor, 'bulkUpdateProducts', 'products', null, {
          requested: ids.length, updated, patch,
        });
        return json({ ok: true, requested: ids.length, updated }, 200, cors);
      }

      default:
        return json({ error: `알 수 없는 action: ${action}` }, 400, cors);
    }
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-operations failed:', err);
    return json({ error: `처리에 실패했습니다: ${message}` }, 500, cors);
  }
});
