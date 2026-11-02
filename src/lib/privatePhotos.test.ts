import { describe, expect, it } from 'vitest';
import { ownedPhotoPath, deleteAccountData, drainPhotoCleanup } from '../../supabase/functions/_shared/accountStorage';

describe('private photo ownership', () => {
  it('accepts only own canonical paths or own Supabase signed/legacy URLs', () => {
    expect(ownedPhotoPath('alice/file.jpg', 'alice', 'https://db.example')).toBe('alice/file.jpg');
    expect(ownedPhotoPath('https://db.example/storage/v1/object/sign/feeding-log-photos/alice/a.jpg?token=x', 'alice', 'https://db.example')).toBe('alice/a.jpg');
    for (const value of ['bob/a.jpg', 'alice/../bob/a.jpg', 'https://evil.example/storage/v1/object/public/feeding-log-photos/alice/a.jpg', 'https://db.example/storage/v1/object/public/feeding-log-photos/bob/a.jpg', 'alice/%2e%2e/a']) {
      expect(ownedPhotoPath(value, 'alice', 'https://db.example')).toBeNull();
    }
  });
});
function fakeDb(failRemoval = false) {
  const calls: string[] = [];
  let owned = [{ bucket_id: 'feeding-log-photos', name: 'alice/orphan.jpg' }];
  const db = {
    rpc: async (name: string) => { calls.push(name); return { data: name === 'account_owned_objects' ? owned : [], error: null }; },
    storage: { from: () => ({ remove: async () => { calls.push('remove'); if (!failRemoval) owned = []; return { error: failRemoval ? new Error('offline') : null }; } }) },
    auth: { admin: { deleteUser: async () => { calls.push('deleteUser'); return { error: null }; } } },
    from: () => ({ delete: () => ({ eq: async () => ({ error: null }) }) }),
  };
  return { db, calls };
}
it('deletes unreferenced owned storage before deleting auth identity', async () => {
  const { db, calls } = fakeDb();
  await deleteAccountData(db as never, 'alice');
  expect(calls.indexOf('remove')).toBeLessThan(calls.indexOf('deleteUser'));
  expect(calls).toContain('begin_account_deletion');
});
it('retains identity and cleanup ownership when storage deletion fails', async () => {
  const { db, calls } = fakeDb(true);
  await expect(deleteAccountData(db as never, 'alice')).rejects.toThrow();
  expect(calls).not.toContain('deleteUser');
});
it('rejects cleanup rows outside the authenticated owner prefix', async () => {
  const { db, calls } = fakeDb();
  db.rpc = async () => ({ data: [{ bucket_id: 'feeding-log-photos', name: 'bob/private.jpg' }], error: null }) as never;
  await expect(drainPhotoCleanup(db as never, 'alice')).rejects.toThrow();
  expect(calls).not.toContain('remove');
});

it('keeps failed photo claims retryable and acknowledges only after storage deletion', async () => {
  const { db } = fakeDb();
  let completed = false;
  let storageRemoved = false;
  let attempts = 0;
  db.rpc = async (name: string) => {
    if (name === 'account_photo_cleanup_batch') {
      return { data: completed ? [] : [{ bucket_id: 'feeding-log-photos', name: 'alice/claimed.jpg' }], error: null };
    }
    if (name === 'ack_account_photo_cleanup') {
      expect(storageRemoved).toBe(true);
      completed = true;
    }
    return { data: [], error: null };
  };
  db.storage.from = () => ({ remove: async () => {
    if (++attempts === 1) return { error: new Error('storage unavailable') };
    storageRemoved = true;
    return { error: null };
  } });
  await expect(drainPhotoCleanup(db as never, 'alice')).rejects.toThrow('storage unavailable');
  expect(completed).toBe(false);
  await drainPhotoCleanup(db as never, 'alice');
  expect(completed).toBe(true);
  expect(attempts).toBe(2);
});
