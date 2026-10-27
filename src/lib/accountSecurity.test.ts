import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';

function load(name: string, extra = '') {
  let handler;
  const deleteAccountData = vi.fn();
  const drainPhotoCleanup = vi.fn();
  const db = { from: vi.fn(), auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'authenticated-owner', is_anonymous: false } }, error: null })), admin: { createUser: vi.fn(), updateUserById: vi.fn() } } };
  const exports = {} as Record<string, (...args: unknown[]) => Promise<string>>;
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8') + extra;
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInContext(code, createContext({ exports, Request, Response, TextEncoder, TextDecoder, crypto: webcrypto, btoa, atob, Date, console,
    Deno: { env: { get: (key: string) => ({ SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-secret', ADMIN_SESSION_SECRET: 'test-secret' })[key] } },
    require(specifier: string) {
      if (specifier.includes('/http/server.ts')) return { serve: (fn) => { handler = fn; } };
      if (specifier.includes('supabase-js')) return { createClient: () => db };
      if (specifier.includes('cors.ts')) return { buildCorsHeaders: () => ({}) };
      if (specifier.includes('accountStorage.ts')) return { deleteAccountData, drainPhotoCleanup };
      return {};
    },
  }));
  return { handler: (request: Request): Promise<Response> => handler(request), exports, db, deleteAccountData, drainPhotoCleanup };
}
const req = (action: string, token?: string) => new Request('https://test.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) }, body: JSON.stringify({ action, email: 'victim@example.invalid', password: 'unused' }) });

it.each(['signup', 'confirm'])('retired admin-auth fails closed for %s without any account write', async (action) => {
  const { handler, db } = load('admin-auth');
  expect((await handler(req(action))).status).toBe(410);
  expect(db.from).not.toHaveBeenCalled();
  expect(db.auth.admin.createUser).not.toHaveBeenCalled();
  expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
});
it('an existing signed admin session cannot mint a new session', async () => {
  const { handler, exports } = load('admin-write', '\nexport { issueAdminSession };');
  const token = await exports.issueAdminSession('test-actor', 'test-secret');
  expect((await handler(req('createAdminSession', token))).status).toBe(401);
  expect((await handler(req('verifyAdmin', token))).status).toBe(200);
});

it('account deletion rejects a missing bearer before any destructive action', async () => {
  const { handler, deleteAccountData, db } = load('account-manage');
  expect((await handler(req('delete-account'))).status).toBe(401);
  expect(deleteAccountData).not.toHaveBeenCalled();
  expect(db.auth.getUser).not.toHaveBeenCalled();
});
it('account deletion ignores supplied foreign user IDs and requires explicit confirmation', async () => {
  const { handler, deleteAccountData, db } = load('account-manage');
  const request = (confirmation: string) => new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer valid-owner-session', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete-account', user_id: 'victim', confirmation }),
  });
  expect((await handler(request('no'))).status).toBe(400);
  expect(deleteAccountData).not.toHaveBeenCalled();
  expect((await handler(request('DELETE'))).status).toBe(200);
  expect(db.auth.getUser).toHaveBeenCalledWith('valid-owner-session');
  expect(deleteAccountData).toHaveBeenCalledWith(db, 'authenticated-owner');
});
it('storage cleanup failure never reports account deletion success', async () => {
  const { handler, deleteAccountData } = load('account-manage');
  deleteAccountData.mockRejectedValue(new Error('storage timeout'));
  const result = await handler(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer valid' }, body: JSON.stringify({ action: 'delete-account', confirmation: 'DELETE' }) }));
  expect(result.status).toBe(503);
  expect((await result.json()).ok).not.toBe(true);
});
