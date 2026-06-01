/** CORS: 비어 있으면 `*`, `CORS_ALLOWED_ORIGINS`(쉼표)가 있으면 요청 Origin이 목록에 있을 때만 해당 Origin을 반사 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  const raw = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '').trim();
  if (!raw) {
    return { ...base, 'Access-Control-Allow-Origin': '*' };
  }
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin');
  if (origin && allowed.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }
  if (!origin && allowed[0]) {
    return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
  }
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] ?? '*' };
}
