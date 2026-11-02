import { environmentValue } from './supabaseServer';

const NATIVE_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];

/** Bearer-only native API: exact origins, no cookies and no wildcard reflection. */
export function withScanCors<C>(handler: (request: Request, context?: C) => Promise<Response>) {
  return async (request: Request, context?: C): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = new Set([
      ...NATIVE_ORIGINS,
      ...environmentValue('SCAN_ALLOWED_ORIGINS').split(',').map((value) => value.trim()).filter(Boolean),
      new URL(request.url).origin,
    ]);
    if (origin && !allowed.has(origin)) return jsonResponse(403, { code: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('access-control-request-method');
      const headers = (request.headers.get('access-control-request-headers') ?? '')
        .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
      if (!origin || !['GET', 'POST'].includes(method ?? '') || headers.some((value) => !['authorization', 'content-type'].includes(value))) {
        return jsonResponse(403, { code: 'preflight_not_allowed' });
      }
    }
    let response: Response;
    try {
      response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await handler(request, context);
    } catch {
      response = jsonResponse(503, { code: 'scan_unavailable' });
    }
    response.headers.append('vary', 'Origin');
    if (origin) {
      response.headers.set('access-control-allow-origin', origin);
      response.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      response.headers.set('access-control-allow-headers', 'authorization, content-type');
    }
    return response;
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return {};
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
