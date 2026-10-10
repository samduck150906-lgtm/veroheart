import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createHmac, webcrypto } from 'node:crypto';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

// Only external Deno HTTP/client imports are replaced. Auth, router, validation
// and migration SQL are the repository sources, executed against ephemeral PG.
const root = new URL('../', import.meta.url);
const productId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const thirdId = '33333333-3333-4333-8333-333333333333';
const oldName = 'Fixture  product 100g';
const targetName = 'Fixture product 100g';
const brand = 'Fixture brand';
const actor = 'local-test-admin';
const secret = 'local-only-synthetic-session-secret';
const item = {
  id: productId, expectedName: oldName, expectedBrandName: brand, name: targetName,
};
let db;
let handler;
let rpcCalls;

function sessionToken() {
  const payload = Buffer.from(JSON.stringify({
    actor, exp: Math.floor(Date.now() / 1000) + 300,
  })).toString('base64url');
  const message = `v1.${payload}`;
  return `${message}.${createHmac('sha256', secret).update(message).digest('base64url')}`;
}

async function loadHandler() {
  const env = new Map([
    ['SUPABASE_URL', 'https://local-admin.invalid'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'local-only-fake-service-key'],
    ['ADMIN_SESSION_SECRET', secret],
  ]);
  const context = createContext({
    Request, Response, TextEncoder, TextDecoder, atob, btoa, console,
    crypto: webcrypto,
    Deno: { env: { get: (key) => env.get(key) } },
    fetch: () => { throw new Error('Network is forbidden in this local harness'); },
  });
  const http = new SyntheticModule(['serve'], function () {
    this.setExport('serve', (callback) => { handler = callback; });
  }, { context });
  const supabase = new SyntheticModule(['createClient'], function () {
    this.setExport('createClient', (url, key) => {
      assert.equal(url, env.get('SUPABASE_URL'));
      assert.equal(key, env.get('SUPABASE_SERVICE_ROLE_KEY'));
      return {
        async rpc(name, args) {
          rpcCalls += 1;
          assert.equal(name, 'admin_apply_product_cleanup');
          assert.deepEqual(Object.keys(args).sort(), ['p_actor', 'p_items']);
          try {
            const result = await db.query(
              'SELECT public.admin_apply_product_cleanup($1::jsonb, $2::text) AS result',
              [JSON.stringify(args.p_items), args.p_actor],
            );
            return { data: result.rows[0].result, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
      };
    });
  }, { context });
  async function sourceModule(path) {
    const source = await readFile(new URL(path, root), 'utf8');
    return new SourceTextModule(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText, { context, identifier: path });
  }
  const validation = await sourceModule('supabase/functions/admin-write/validation.ts');
  const edge = await sourceModule('supabase/functions/admin-write/index.ts');
  await edge.link((specifier) => {
    if (specifier === 'https://deno.land/std@0.168.0/http/server.ts') return http;
    if (specifier === 'https://esm.sh/@supabase/supabase-js@2.39.0') return supabase;
    if (specifier === './validation.ts') return validation;
    throw new Error(`Unexpected module: ${specifier}`);
  });
  await edge.evaluate();
  assert.equal(typeof handler, 'function');
}

async function request(items, token = sessionToken()) {
  const response = await handler(new Request('https://local-admin.invalid/functions/v1/admin-write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      'x-admin-token': token,
    },
    body: JSON.stringify({ action: 'applyProductCleanup', items }),
  }));
  return { status: response.status, body: await response.json() };
}

async function snapshot() {
  const products = await db.query('SELECT * FROM public.products ORDER BY id');
  const audits = await db.query('SELECT * FROM public.admin_audit_log ORDER BY id');
  return { products: products.rows, audits: audits.rows };
}

describe('local admin-write authentication/router + real cleanup PL/pgSQL', () => {
  before(async () => {
    db = await PGlite.create();
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE TABLE public.products (
        id uuid PRIMARY KEY, name text NOT NULL, brand_name text NOT NULL,
        barcode text, kcal_per_100g numeric, unrelated jsonb
      );
      CREATE TABLE public.admin_audit_log (
        id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
        target_table text NOT NULL, target_id text NOT NULL, detail jsonb NOT NULL
      );
    `);
    await db.exec(await readFile(new URL(
      'supabase/migrations/20260929230000_atomic_product_cleanup.sql', root,
    ), 'utf8'));
    await loadHandler();
  });
  after(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`
      ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS reject_fixture_audit;
      TRUNCATE public.products, public.admin_audit_log RESTART IDENTITY;
    `);
    await db.query(`
      INSERT INTO public.products VALUES
        ($1, $2, $3, 'fixture-barcode', 123.4, '{"sentinel":true}'),
        ($4, 'Other product 200g', $3, 'other-barcode', 222, '{}'),
        ($5, 'Third product 300g', $3, 'third-barcode', 333, '{}')
    `, [productId, oldName, brand, otherId, thirdId]);
    rpcCalls = 0;
  });

  it('rejects absent/invalid admin sessions before reaching the database', async () => {
    const beforeState = await snapshot();
    assert.equal((await request([item], '')).status, 401);
    assert.equal((await request([item], 'invalid-local-token')).status, 401);
    assert.equal(rpcCalls, 0);
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('saves only the selected field and records exact before/after in one audit', async () => {
    const beforeState = await snapshot();
    const { status, body } = await request([item]);
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.applied, 1);
    assert.equal(body.results[0].status, 'applied');
    const afterState = await snapshot();
    assert.deepEqual(afterState.products, beforeState.products.map((p) => (
      p.id === productId ? { ...p, name: targetName } : p
    )));
    assert.equal(afterState.audits.length, 1);
    assert.equal(afterState.audits[0].actor, actor);
    assert.equal(afterState.audits[0].target_id, productId);
    assert.equal(afterState.audits[0].action, 'applyProductCleanup');
    assert.deepEqual(afterState.audits[0].detail, {
      batchId: body.batchId,
      before: { name: oldName, brand_name: brand },
      after: { name: targetName, brand_name: brand },
      changedFields: ['name'],
    });
  });

  it('returns conflict for stale expected values with a different target without writes', async () => {
    const beforeState = await snapshot();
    const { status, body } = await request([{ ...item, expectedName: 'Stale fixture value' }]);
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.applied, 0);
    assert.equal(body.conflicts, 1);
    assert.equal(body.results[0].status, 'conflict');
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('replays the identical successful payload as already_applied with no duplicate audit', async () => {
    const first = await request([item]);
    const beforeReplay = await snapshot();
    const replay = await request([item]);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.ok, true);
    assert.equal(replay.body.requested, 1);
    assert.equal(replay.body.applied, 0);
    assert.equal(replay.body.conflicts, 0);
    assert.equal(replay.body.failed, 0);
    assert.equal(replay.body.results[0].status, 'already_applied');
    assert.notEqual(replay.body.batchId, first.body.batchId);
    assert.deepEqual(await snapshot(), beforeReplay);
    assert.equal(beforeReplay.audits.length, 1);
  });

  it('prioritizes an already-current target over stale expected values', async () => {
    const beforeState = await snapshot();
    const response = await request([{ ...item, name: oldName, expectedName: 'Stale fixture value' }]);
    assert.equal(response.body.results[0].status, 'already_applied');
    assert.equal(response.body.conflicts, 0);
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('blocks normalized duplicate targets without product or audit changes', async () => {
    const beforeState = await snapshot();
    const response = await request([{ ...item, name: 'other PRODUCT 200g' }]);
    assert.equal(response.body.results[0].status, 'duplicate');
    assert.equal(response.body.applied, 0);
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('rolls back the product update when audit insertion fails', async () => {
    await db.exec(`ALTER TABLE public.admin_audit_log ADD CONSTRAINT reject_fixture_audit
      CHECK (actor <> 'local-test-admin')`);
    const beforeState = await snapshot();
    const response = await request([item]);
    assert.equal(response.body.results[0].status, 'failed');
    assert.equal(response.body.failed, 1);
    assert.equal(response.body.applied, 0);
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('rejects forbidden fields and duplicate IDs in Edge validation before RPC', async () => {
    const beforeState = await snapshot();
    assert.equal((await request([{ ...item, barcode: 'forbidden' }])).status, 400);
    assert.equal((await request([item, item])).status, 400);
    assert.equal(rpcCalls, 0);
    assert.deepEqual(await snapshot(), beforeState);
  });

  it('distinguishes partial per-item success, conflict and missing rows atomically', async () => {
    const response = await request([
      item,
      { id: otherId, expectedName: 'Stale', expectedBrandName: brand, name: 'Not applied' },
      { id: '44444444-4444-4444-8444-444444444444', expectedName: 'Missing', expectedBrandName: brand, name: 'Missing target' },
    ]);
    assert.deepEqual(response.body.results.map((r) => r.status), ['applied', 'conflict', 'not_found']);
    assert.equal(response.body.applied, 1);
    assert.equal(response.body.conflicts, 1);
    assert.equal(response.body.failed, 1);
    const state = await snapshot();
    assert.equal(state.audits.length, 1);
    assert.equal(state.products.find((p) => p.id === otherId).name, 'Other product 200g');
  });
});
