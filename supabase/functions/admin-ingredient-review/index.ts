import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-ingredient-review — 성분 위험도 검수용 조회·일괄 반영.
 *
 * 검수 판단(무엇이 후보인가)은 프론트의 ingredientRiskReview 가 한다. 이 함수는
 * 두 가지만 맡는다.
 *   1. 판단에 필요한 재료를 한 번에 준다 — 성분 전체 + 각 성분을 쓰는 제품 수.
 *      제품 수가 있어야 "몇 개 제품에 영향이 가는지" 보고 우선순위를 정할 수 있다.
 *   2. 운영자가 고른 결정을 한 요청으로 반영한다. 한 건씩 보내면 수십 번
 *      왕복해야 하고, 중간에 끊기면 절반만 반영된 상태가 남는다.
 *
 * 위험도는 보호자가 급여 여부를 정하는 값이라, 바뀐 내역은 전부 감사 로그에
 * 남긴다(누가, 무엇을, 어디서 어디로).
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

/** 한 요청에서 반영할 수 있는 결정 수. 실수로 사전 전체를 한 번에 바꾸지 못하게 한다. */
const MAX_DECISIONS = 100;
const RISK_LEVELS = new Set(['safe', 'caution', 'danger']);
const PAGE = 1000;

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

/** 사용자에게 그대로 보여줄 수 있는 검증 오류. 내부 DB 오류와 구분한다. */
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

function requireText(value: unknown, label: string, max = 200): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new ValidationError(`${label}은(는) 필수입니다.`);
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

function requireRiskLevel(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!RISK_LEVELS.has(s)) throw new ValidationError('위험도 값이 올바르지 않습니다.');
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
    target_table: 'ingredients',
    target_id: targetId,
    detail,
  });
  if (error) console.error('audit log failed:', error.message);
}

/** 페이지를 끝까지 읽는다 — PostgREST 응답 상한(기본 1000행)에 잘리지 않게. */
async function selectAll(db: Db, table: string, columns: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
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
      /** 검수 화면이 판단에 쓸 재료 — 성분 전체 + 성분별 사용 제품 수. */
      case 'listRiskReview': {
        const [ingredients, links] = await Promise.all([
          selectAll(db, 'ingredients', 'id, name_ko, name_en, risk_level, category, description'),
          selectAll(db, 'product_ingredients', 'ingredient_id'),
        ]);

        const counts = new Map<string, number>();
        for (const link of links) {
          const id = String(link.ingredient_id ?? '');
          if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
        }

        return json(
          {
            ok: true,
            ingredients: ingredients.map((row) => ({
              id: row.id,
              name_ko: row.name_ko,
              name_en: row.name_en ?? null,
              risk_level: row.risk_level,
              category: row.category ?? null,
              description: row.description ?? null,
              productCount: counts.get(String(row.id)) ?? 0,
            })),
          },
          200,
          cors,
        );
      }

      /**
       * 운영자가 고른 결정을 한 번에 반영한다.
       *
       * updates 는 기존 성분의 위험도만 바꾼다(이름·영양값은 건드리지 않는다).
       * creates 는 사전에 없던 위험 성분을 새로 등록한다. 이름이 이미 있으면
       * 실패로 세지 않고 건너뛴다 — 다른 창에서 먼저 등록했을 수 있다.
       */
      case 'applyRiskDecisions': {
        const rawUpdates = Array.isArray(body.updates) ? body.updates : [];
        const rawCreates = Array.isArray(body.creates) ? body.creates : [];
        if (rawUpdates.length === 0 && rawCreates.length === 0) {
          throw new ValidationError('반영할 결정이 없습니다.');
        }
        if (rawUpdates.length + rawCreates.length > MAX_DECISIONS) {
          throw new ValidationError(`한 번에 최대 ${MAX_DECISIONS}건까지 반영할 수 있습니다.`);
        }

        const seen = new Set<string>();
        const updates = rawUpdates.map((item) => {
          const row = (item ?? {}) as Record<string, unknown>;
          const id = requireUuid(row.id, '성분 ID');
          if (seen.has(id)) throw new ValidationError('같은 성분이 목록에 중복으로 들어 있습니다.');
          seen.add(id);
          return { id, risk_level: requireRiskLevel(row.riskLevel ?? row.risk_level) };
        });

        const creates = rawCreates.map((item) => {
          const row = (item ?? {}) as Record<string, unknown>;
          return {
            name_ko: requireText(row.nameKo ?? row.name_ko, '한글 성분명'),
            name_en: optionalText(row.nameEn ?? row.name_en, '영문 성분명', 200),
            risk_level: requireRiskLevel(row.riskLevel ?? row.risk_level),
            category: optionalText(row.category, '성분 분류', 200),
            description: optionalText(row.description, '설명', 2000),
          };
        });

        const changes: Record<string, unknown>[] = [];
        let updated = 0;
        let created = 0;
        const skipped: string[] = [];

        for (const update of updates) {
          // 바꾸기 전 값을 읽어 둔다 — 감사 로그에 어디서 어디로 바뀌었는지 남긴다.
          const { data: before, error: readError } = await db
            .from('ingredients')
            .select('id, name_ko, risk_level')
            .eq('id', update.id)
            .maybeSingle();
          if (readError) throw readError;
          if (!before) {
            skipped.push(`${update.id}: 성분을 찾을 수 없습니다.`);
            continue;
          }
          if (before.risk_level === update.risk_level) continue;

          const { error: updateError } = await db
            .from('ingredients')
            .update({ risk_level: update.risk_level })
            .eq('id', update.id);
          if (updateError) throw updateError;

          updated += 1;
          changes.push({
            id: update.id,
            name: before.name_ko,
            from: before.risk_level,
            to: update.risk_level,
          });
        }

        for (const create of creates) {
          const { data: existing, error: findError } = await db
            .from('ingredients')
            .select('id')
            .eq('name_ko', create.name_ko)
            .maybeSingle();
          if (findError) throw findError;
          if (existing) {
            skipped.push(`${create.name_ko}: 이미 사전에 있습니다.`);
            continue;
          }

          const { data: inserted, error: insertError } = await db
            .from('ingredients')
            .insert(create)
            .select('id')
            .single();
          if (insertError) throw insertError;

          created += 1;
          changes.push({ id: inserted?.id ?? null, name: create.name_ko, from: null, to: create.risk_level });
        }

        await audit(db, actor, 'applyRiskDecisions', null, {
          updated,
          created,
          skipped: skipped.slice(0, 20),
          changes,
        });
        return json({ ok: true, updated, created, skipped }, 200, cors);
      }

      default:
        return json({ error: `알 수 없는 action: ${action}` }, 400, cors);
    }
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-ingredient-review failed:', err);
    return json({ error: `처리에 실패했습니다: ${message}` }, 500, cors);
  }
});
