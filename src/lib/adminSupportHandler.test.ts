import { beforeEach, expect, it, vi } from 'vitest';
import { handleSupport } from '../../supabase/functions/admin-write/support';
const rpc = vi.fn();
const id = '11111111-1111-4111-8111-111111111111';
const patch = {
  name: 'QA보리',
  pet_type: 'dog',
  age_group: 'adult',
  breed: null,
  weight: 6.8,
  allergies: [],
  conditions: [],
};
beforeEach(() =>
  rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null }),
);
it('forwards only permitted correction columns and server-authenticated actor to the transaction', async () => {
  await handleSupport({ rpc }, 'verified-admin', 'correctPet', {
    id,
    reason: '보호자 요청',
    patch: { ...patch, user_id: 'attacker', is_admin: true },
    expected: patch,
    actor: 'spoof',
  });
  expect(rpc).toHaveBeenCalledWith('admin_support_correct', {
    p_table: 'pets',
    p_id: id,
    p_patch: patch,
    p_expected: patch,
    p_actor: 'verified-admin',
    p_reason: '보호자 요청',
  });
});
it('rejects missing reasons and original values before touching the database', async () => {
  await expect(
    handleSupport({ rpc }, 'admin', 'correctPet', {
      id,
      reason: '',
      patch,
      expected: patch,
    }),
  ).rejects.toThrow();
  await expect(
    handleSupport({ rpc }, 'admin', 'correctPet', {
      id,
      reason: '요청',
      patch,
      expected: {},
    }),
  ).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
it('returns an actionable conflict instead of reporting a successful write', async () => {
  rpc.mockResolvedValue({ error: { code: '40001' } });
  await expect(
    handleSupport({ rpc }, 'admin', 'correctPet', {
      id,
      reason: '요청',
      patch,
      expected: patch,
    }),
  ).rejects.toThrow('새로고침');
});
it('moderates visibility without altering an author rating or identity', async () => {
  await handleSupport({ rpc }, 'admin', 'moderateReview', {
    id,
    reason: '중복 확인',
    patch: { is_hidden: true, rating: 1, user_id: 'attack' },
    expected: { is_hidden: false },
  });
  expect(rpc).toHaveBeenCalledWith(
    'admin_support_correct',
    expect.objectContaining({
      p_table: 'reviews',
      p_patch: { is_hidden: true },
      p_expected: { is_hidden: false },
    }),
  );
});
