export const PHOTO_BUCKET = 'feeding-log-photos';

/** Never sign or remove another account's path, a remote URL, or traversal. */
export function ownedPhotoPath(value: string | null | undefined, userId: string, origin: string): string | null {
  if (!value || !userId) return null;
  let path = value;
  if (/^https?:\/\//.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(origin).origin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/feeding-log-photos\/(.+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  const pieces = path.split('/');
  if (pieces.length < 2 || pieces[0] !== userId || pieces.some((p) => !p || p === '.' || p === '..' || !/^[a-zA-Z0-9._-]+$/.test(p))) return null;
  return path;
}

type Result = { data?: unknown; error?: unknown };
export interface AccountStorageClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
  storage: { from(bucket: string): { remove(paths: string[]): Promise<Result> } };
  auth: { admin: { deleteUser(id: string): Promise<Result> } };
  from(table: string): { delete(): { eq(key: string, value: string): PromiseLike<Result> } };
}
type StoredObject = { bucket_id: string; name: string };

export async function drainPhotoCleanup(db: AccountStorageClient, userId: string): Promise<void> {
  // The RPC atomically claims paths and blocks later references/re-uploads.
  // Failed storage calls leave claims retryable; ack retains permanent tombstones.
  for (let page = 0; page < 100; page++) {
    const result = await db.rpc('account_photo_cleanup_batch', { p_user_id: userId });
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as StoredObject[];
    if (!rows.length) return;
    for (const row of rows) {
      if (row.bucket_id !== PHOTO_BUCKET || !ownedPhotoPath(row.name, userId, 'https://unused.invalid')) throw new Error('Invalid cleanup ownership');
    }
    const removal = await db.storage.from(PHOTO_BUCKET).remove(rows.map((r) => r.name));
    if (removal.error) throw removal.error;
    const ack = await db.rpc('ack_account_photo_cleanup', { p_user_id: userId, p_paths: rows.map((r) => r.name) });
    if (ack.error) throw ack.error;
  }
  throw new Error('Cleanup is incomplete; retry to continue.');
}

export async function deleteAccountData(db: AccountStorageClient, userId: string): Promise<void> {
  // The DB marks deletion in progress before enumeration. A storage trigger blocks
  // further uploads by this identity, including uploads from another active device.
  const lock = await db.rpc('begin_account_deletion', { p_user_id: userId });
  if (lock.error) throw lock.error;
  for (let page = 0; page < 100; page++) {
    // Includes objects owned by auth.uid AND owner-prefixed service uploads/orphans.
    const result = await db.rpc('account_owned_objects', { p_user_id: userId });
    if (result.error) throw result.error;
    const objects = (result.data ?? []) as StoredObject[];
    if (!objects.length) {
      const deletion = await db.auth.admin.deleteUser(userId);
      if (deletion.error) throw deletion.error;
      return;
    }
    for (const bucket of new Set(objects.map((row) => row.bucket_id))) {
      const removal = await db.storage.from(bucket).remove(objects.filter((r) => r.bucket_id === bucket).map((r) => r.name));
      if (removal.error) throw removal.error;
    }
  }
  throw new Error('Account cleanup is incomplete; retry to continue.');
}
