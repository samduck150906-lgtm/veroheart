import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createHmac, webcrypto } from 'node:crypto';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { isAdminSessionActorCurrent } from '../../supabase/functions/_shared/temporaryAdminSession';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const secret = 'test-admin-session-secret';

function adminToken(actor = 'editor') {
  const payload = Buffer.from(JSON.stringify({ actor, exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
  const signed = `v1.${payload}`;
  return `${signed}.${createHmac('sha256', secret).update(signed).digest('base64url')}`;
}

function loadHandler(result: { data: unknown; error: unknown }, env: Record<string,string> = {}) {
  let handler!: (request: Request) => Promise<Response>;
  let from = 0, to = 999;
  const nullFilters: string[]=[];
  const matches=(row: unknown)=>!row || nullFilters.every(column=>(row as Record<string,unknown>)[column]==null);
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn((start: number, end: number) => { from = start; to = end; return builder; }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ ...result, data: Array.isArray(result.data) ? result.data.filter(matches).slice(from, to + 1) : result.data }).then(resolve),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn((column: string,value: unknown)=>{if(value===null)nullFilters.push(column);return builder;}),
    maybeSingle: vi.fn(async()=>({...result,data:matches(result.data)?result.data:null})),
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
      ...env,
    })[key] } },
    require(specifier: string) {
      if (specifier.includes('/http/server.ts')) return { serve: (fn: typeof handler) => { handler = fn; } };
      if (specifier.includes('supabase-js')) return { createClient };
      if (specifier.endsWith('/temporaryAdminSession.ts')) return { isAdminSessionActorCurrent };
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
  it('rejects an already issued QA session immediately after its access is removed',async()=>{
    const env:Record<string,string>={TEMP_ADMIN_ID:'qa-read-fixture',TEMP_ADMIN_CREDENTIAL_SHA256:'a'.repeat(64),TEMP_ADMIN_EXPIRES_AT:String(Math.floor(Date.now()/1000)+600)};
    const {handler,createClient}=loadHandler({data:null,error:null},env);
    const token=adminToken('qa-read-fixture');
    expect((await handler(request(token))).status).toBe(200);
    createClient.mockClear();delete env.TEMP_ADMIN_ID;
    expect((await handler(request(token))).status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
  });
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
    expect(builder.is).toHaveBeenCalledWith('catalog_archived_at',null);
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

  it('does not load an archived source record into the active product editor',async()=>{
    const {handler}=loadHandler({data:{id:PRODUCT_ID,catalog_archived_at:'2026-11-13T00:00:00Z'},error:null});
    expect(await(await handler(request(adminToken()))).json()).toEqual({ok:true,product:null});
  });

  it('rejects malformed product IDs before querying any product', async () => {
    const { handler, db } = loadHandler({ data: null, error: null });
    expect((await handler(request(adminToken(), 'not-an-id'))).status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });
});

it('reads later facts pages with stable ties and manufacturer source evidence', async () => {
  const rows = Array.from({ length: 1005 }, (_, i) => ({ id: String(i), name: '같은 제품명', catalog_source_url: 'https://manufacturer.example/' + i }));
  const { handler, builder } = loadHandler({ data: rows, error: null });
  const response = await handler(new Request('https://test.invalid/functions/v1/admin-products-read', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken() }, body: JSON.stringify({ view: 'facts' }) }));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.rows).toHaveLength(1005);
  expect(result.rows.at(-1).id).toBe('1004');
  expect(builder.select.mock.calls[0][0]).toContain('catalog_source_url');
  expect(builder.order).toHaveBeenCalledWith('id', { ascending: true });
});

it('excludes archived records from active facts scans',async()=>{
 const {handler}=loadHandler({data:[{id:'active',catalog_archived_at:null},{id:'archive',catalog_archived_at:'2026-11-13T00:00:00Z'}],error:null});
 const response=await handler(new Request('https://test.invalid/functions/v1/admin-products-read',{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':adminToken()},body:JSON.stringify({view:'facts'})}));
 expect((await response.json()).rows.map((r:{id:string})=>r.id)).toEqual(['active']);
});
