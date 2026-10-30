import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createHmac, webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const secret = 'test-admin-session-secret';

function adminToken() {
  const payload = Buffer.from(JSON.stringify({ actor: 'editor', exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
  const signed = `v1.${payload}`;
  return `${signed}.${createHmac('sha256', secret).update(signed).digest('base64url')}`;
}

function loadHandler(result: { data: unknown; error: unknown }) {
  let handler!: (request: Request) => Promise<Response>;
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  const db = { from: vi.fn().mockReturnValue(builder) };
  const createClient = vi.fn(() => db);
  const source = readFileSync('supabase/functions/admin-products-read/index.ts', 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInContext(code, createContext({
    exports: {}, Request, Response, TextEncoder, TextDecoder, crypto: webcrypto, atob, btoa,
    console: { error: vi.fn() },
    Deno: { env: { get: (key: string) => ({
      SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'service-only-key', ADMIN_SESSION_SECRET: secret,
    })[key] } },
    require(specifier: string) {
      if (specifier.includes('/http/server.ts')) return { serve: (fn: typeof handler) => { handler = fn; } };
      if (specifier.includes('supabase-js')) return { createClient };
      throw new Error(`Unexpected dependency ${specifier}`);
    },
  }));
  return { handler, db, builder, createClient };
}

function request(token?: string, id = PRODUCT_ID) {
  return new Request('https://test.invalid/functions/v1/admin-products-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
    body: JSON.stringify({ view: 'edit', id }),
  });
}

describe('admin-products-read edit evidence', () => {
  it.each([undefined, 'invalid-admin-token'])('rejects unauthorized evidence reads before opening a database client (%s)', async (token) => {
    const { handler, createClient } = loadHandler({ data: null, error: null });
    expect((await handler(request(token))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each([
    { verification_status: 'pending', is_visible: true },
    { verification_status: 'verified', is_visible: false },
  ])('reads complete edit evidence for a private product with the authenticated service role (%j)', async (visibility) => {
    const product = {
      id: PRODUCT_ID, name: '비공개 사료', ...visibility,
      nutritional_profiles: { crude_protein: 30, moisture: 10 },
      product_ingredients: [{ ingredient_id: 'ingredient-1', sort_order: 0, ingredients: { id: 'ingredient-1', name_ko: '연어', name_en: 'Salmon', risk_level: 'safe' } }],
    };
    const { handler, db, builder, createClient } = loadHandler({ data: product, error: null });
    const response = await handler(request(adminToken()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, product });
    expect(createClient).toHaveBeenCalledWith('https://test.invalid', 'service-only-key', expect.any(Object));
    expect(db.from).toHaveBeenCalledWith('products');
    expect(builder.eq).toHaveBeenCalledExactlyOnceWith('id', PRODUCT_ID);
    const columns = builder.select.mock.calls[0][0] as string;
    expect(columns).toContain('nutritional_profiles(');
    expect(columns).toContain('product_ingredients(');
    expect(columns).toContain('ingredients(');
    expect(columns).toContain('sort_order');
  });

  it('reports an evidence query failure instead of returning a successful empty edit', async () => {
    const { handler } = loadHandler({ data: null, error: new Error('evidence query failed') });
    const response = await handler(request(adminToken()));
    expect(response.status).toBe(500);
    expect((await response.json()).ok).not.toBe(true);
  });

  it('rejects malformed product IDs before querying any product', async () => {
    const { handler, db } = loadHandler({ data: null, error: null });
    expect((await handler(request(adminToken(), 'not-an-id'))).status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });
});
