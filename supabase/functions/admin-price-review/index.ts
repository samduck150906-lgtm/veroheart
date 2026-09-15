import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-price-review — 판매가 변동 제안의 조회와 승인/거절.
 *
 * coupang-price-sync 가 쌓아 둔 product_price_proposals 를 관리자가 확인하고
 * 승인한 것만 products.min_price 에 반영한다. 외부에서 읽어 온 값이 곧바로
 * 앱에 나가지 않게 하는 마지막 관문이다.
 *
 * admin-write 와 분리한 이유: 가격 워크플로는 coupang-price-sync 와 한 쌍으로
 * 움직이고, 두 함수가 같은 테이블(product_price_proposals)만 다룬다. 관리자
 * 콘솔 전반을 담당하는 admin-write 를 건드리지 않고 이 흐름만 따로 배포·롤백할
 * 수 있다.
 *
 * 인증: admin-write 와 같은 x-admin-token 규약을 따른다.
 *   - 로그인한 콘솔이 들고 있는 `v1.<payload>.<sig>` 세션 토큰
 *   - 또는 원본 자격증명(btoa("id:pw"))의 SHA-256 화이트리스트
 */

const ALLOWED_TOKEN_HASHES = new Set([
  '0a6a2e1f8723c72cf8e729d3ea6af059f6c6d3035b589eaf7e53f7a9f10e3f7d',
]);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://veroro-admin.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

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
  // 목록에 없는 출처에는 허용 목록의 첫 항목을 돌려준다 → 브라우저가 불일치로 차단한다.
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
}

/** 사용자에게 그대로 보여줄 수 있는 검증 오류. 내부 DB 오류와 구분한다. */
class ValidationError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;

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

function clampPage(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function clampPageSize(value: unknown, fallback = 20): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
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

/** 관리자 토큰 검증 — admin-write 와 같은 두 가지 형태를 모두 받는다. */
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
  db: Db,
  actor: string,
  action: string,
  targetId: string | null,
  detail: Record<string, unknown> = {},
) {
  // 감사 로그 실패가 본 작업을 되돌리지 않도록 오류를 삼킨다(서버 로그에만 남긴다).
  const { error } = await db.from('admin_audit_log').insert({
    actor,
    action,
    target_table: 'product_price_proposals',
    target_id: targetId,
    detail,
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
      case 'listPriceProposals': {
        const page = clampPage(body.page);
        const pageSize = clampPageSize(body.pageSize);
        const from = (page - 1) * pageSize;
        const status = optionalText(body.status, '상태', 20) ?? 'pending';
        if (!['pending', 'approved', 'rejected', 'all'].includes(status)) {
          throw new ValidationError('상태 값이 올바르지 않습니다.');
        }

        let query = db
          .from('product_price_proposals')
          .select(
            'id, product_id, current_price, proposed_price, source, source_url, status, detected_at, reviewed_by, reviewed_at, note, products!inner(id, name, brand_name, image_url, min_price)',
            { count: 'exact' },
          )
          .order('detected_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (status !== 'all') query = query.eq('status', status);

        const { data, count, error } = await query;
        if (error) throw error;

        // 마지막 동기화 실행 정보 — "언제 돌았고 몇 건이 바뀌었는지"를 같이 보여 준다.
        const { data: lastRun } = await db
          .from('price_sync_runs')
          .select('started_at, finished_at, checked, changed, failed, error')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return json(
          {
            ok: true,
            total: count ?? 0,
            lastRun: lastRun ?? null,
            proposals: (data ?? []).map((row: Record<string, unknown>) => {
              const product = (Array.isArray(row.products) ? row.products[0] : row.products) as
                Record<string, unknown> | null;
              return {
                id: row.id,
                productId: row.product_id,
                productName: product?.name ?? '삭제된 제품',
                brandName: product?.brand_name ?? '',
                imageUrl: product?.image_url ?? null,
                currentPrice: row.current_price === null ? null : Number(row.current_price),
                // 감지 시점이 아니라 지금의 실제 값 — 그 사이 수동으로 바뀌었을 수 있다.
                livePrice: product?.min_price === null || product?.min_price === undefined
                  ? null
                  : Number(product.min_price),
                proposedPrice: Number(row.proposed_price),
                source: row.source,
                sourceUrl: row.source_url ?? null,
                status: row.status,
                detectedAt: row.detected_at,
                reviewedBy: row.reviewed_by ?? null,
                reviewedAt: row.reviewed_at ?? null,
                note: row.note ?? null,
              };
            }),
          },
          200,
          cors,
        );
      }

      /**
       * 가격 변동 제안 승인/거절.
       *
       * 승인하면 그때 비로소 products.min_price 가 바뀐다. 거절하면 제안만 닫히고
       * 제품은 그대로다. 어느 쪽이든 누가 언제 무엇을 했는지 감사 로그에 남는다.
       */
      case 'reviewPriceProposal': {
        const id = requireUuid(body.id, '제안 ID');
        const decision = typeof body.decision === 'string' ? body.decision.trim() : '';
        if (decision !== 'approve' && decision !== 'reject') {
          throw new ValidationError('처리 값은 approve 또는 reject 여야 합니다.');
        }
        const note = optionalText(body.note, '검수 메모', 500);

        const { data: proposal, error: findError } = await db
          .from('product_price_proposals')
          .select('id, product_id, current_price, proposed_price, status')
          .eq('id', id)
          .maybeSingle();
        if (findError) throw findError;
        if (!proposal) throw new ValidationError('제안을 찾을 수 없습니다.');
        if (proposal.status !== 'pending') throw new ValidationError('이미 처리된 제안입니다.');

        const now = new Date().toISOString();
        let appliedPrice: number | null = null;

        if (decision === 'approve') {
          const { data: updated, error: applyError } = await db
            .from('products')
            .update({ min_price: proposal.proposed_price })
            .eq('id', proposal.product_id)
            .select('id, name, min_price')
            .single();
          if (applyError) throw applyError;
          if (!updated || Number(updated.min_price) !== Number(proposal.proposed_price)) {
            throw new Error('가격 반영 결과를 확인하지 못했습니다.');
          }
          appliedPrice = Number(updated.min_price);
        }

        const { error: markError } = await db
          .from('product_price_proposals')
          .update({
            status: decision === 'approve' ? 'approved' : 'rejected',
            reviewed_by: actor,
            reviewed_at: now,
            note,
          })
          .eq('id', id);
        if (markError) throw markError;

        await audit(db, actor, 'reviewPriceProposal', id, {
          productId: proposal.product_id,
          decision,
          from: proposal.current_price,
          to: proposal.proposed_price,
          appliedPrice,
          note,
        });
        return json({ ok: true, decision, appliedPrice }, 200, cors);
      }

      default:
        return json({ error: `알 수 없는 action: ${action}` }, 400, cors);
    }
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-price-review failed:', err);
    return json({ error: `처리에 실패했습니다: ${message}` }, 500, cors);
  }
});
