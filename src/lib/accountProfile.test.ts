import { afterEach, expect, it, vi } from 'vitest';
import { getUserProfile, supabase } from './supabase';

afterEach(() => vi.restoreAllMocks());

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result), maybeSingle: vi.fn().mockResolvedValue(result),
  };
  vi.spyOn(supabase, 'from').mockReturnValue(builder as never);
  return builder;
}

it('requests only the named account profile fields from the matching user row', async () => {
  const builder = query({ data: { id: 'owner', nickname: '가입닉네임' }, error: null });
  expect(await getUserProfile('owner')).toEqual({ id: 'owner', nickname: '가입닉네임' });
  expect(supabase.from).toHaveBeenCalledWith('users');
  expect(builder.select).toHaveBeenCalledWith('id,nickname');
  expect(builder.eq).toHaveBeenCalledWith('id', 'owner');
});

it('propagates profile query failures instead of treating them as missing account fields', async () => {
  query({ data: null, error: { message: 'offline' } });
  await expect(getUserProfile('owner')).rejects.toEqual({ message: 'offline' });
});

it('allows an absent legacy profile row to use authenticated account metadata', async () => {
  query({ data: null, error: null });
  expect(await getUserProfile('owner')).toBeNull();
});
