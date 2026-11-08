import {
  clampPage,
  clampPageSize,
  escapeLike,
  optionalText,
  optionalUuid,
  requireUuid,
  ValidationError,
} from './validation.ts';
import {
  normalizeDiaryCorrection,
  normalizePetCorrection,
  supportReason,
} from './supportValidation.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

function checked(result: { data: unknown; error?: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

export async function handleSupport(
  db: Db,
  actor: string,
  action: string,
  body: Record<string, unknown>,
) {
  if (
    action === 'correctPet' ||
    action === 'correctFeedingLog' ||
    action === 'moderateReview'
  ) {
    const id = requireUuid(body.id, '대상 ID');
    const reason = supportReason(body.reason);
    const raw = body.patch as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new ValidationError('수정 데이터가 필요합니다.');
    const patch =
      action === 'correctPet'
        ? normalizePetCorrection(raw)
        : action === 'correctFeedingLog'
          ? normalizeDiaryCorrection(raw)
          : typeof raw.is_hidden === 'boolean'
            ? { is_hidden: raw.is_hidden }
            : (() => {
                throw new ValidationError('노출 상태가 올바르지 않습니다.');
              })();
    const expected = body.expected as Record<string, unknown>;
    if (!expected || typeof expected !== 'object' || Array.isArray(expected))
      throw new ValidationError('원본 값이 필요합니다.');
    const original = Object.fromEntries(
      Object.keys(patch).map((k) => {
        if (!(k in expected))
          throw new ValidationError(
            '원본 값이 빠져 있습니다. 새로고침 후 다시 시도해 주세요.',
          );
        return [k, expected[k]];
      }),
    );
    const result = await db.rpc('admin_support_correct', {
      p_table:
        action === 'correctPet'
          ? 'pets'
          : action === 'correctFeedingLog'
            ? 'pet_feeding_logs'
            : 'reviews',
      p_id: id,
      p_patch: patch,
      p_expected: original,
      p_actor: actor,
      p_reason: reason,
    });
    if (result.error?.code === '40001')
      throw new ValidationError(
        '사용자 또는 다른 관리자가 변경했습니다. 새로고침 후 다시 확인해 주세요.',
      );
    checked(result);
    return { ok: true };
  }
  if (action === 'getMemberActivity') {
    const id = requireUuid(body.id, '회원 ID');
    const [favorites, recent, requests] = await Promise.all([
      db
        .from('favorites')
        .select('product_id,created_at,products(name,brand_name)', {
          count: 'exact',
        })
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      db
        .from('recent_views')
        .select('product_id,viewed_at,products(name,brand_name)', {
          count: 'exact',
        })
        .eq('user_id', id)
        .order('viewed_at', { ascending: false })
        .limit(20),
      db
        .from('product_requests')
        .select('id,requested_name,status,created_at', { count: 'exact' })
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    return {
      ok: true,
      favorites: checked(favorites),
      favoriteCount: favorites.count ?? 0,
      recentViews: checked(recent),
      recentCount: recent.count ?? 0,
      requests: checked(requests),
      requestCount: requests.count ?? 0,
    };
  }
  const page = clampPage(body.page),
    size = clampPageSize(body.pageSize),
    from = (page - 1) * size;
  if (action === 'listAdminAudit') {
    let query = db
      .from('admin_audit_log')
      .select('id,actor,action,target_table,target_id,detail,created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + size - 1);
    const targetId = optionalText(body.targetId, '대상 ID', 100);
    if (targetId) query = query.eq('target_id', targetId);
    const table = optionalText(body.table, '관리 대상', 100);
    if (table) query = query.eq('target_table', table);
    const r = await query;
    checked(r);
    return { ok: true, rows: r.data ?? [], total: r.count ?? 0 };
  }
  if (action === 'listAdminReviews') {
    let query = db
      .from('reviews')
      .select(
        'id,user_id,product_id,rating,is_hidden,created_at,users(nickname),products(name,brand_name)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + size - 1);
    const userId = optionalUuid(body.userId, '회원 ID');
    if (userId) query = query.eq('user_id', userId);
    if (typeof body.hidden === 'boolean')
      query = query.eq('is_hidden', body.hidden);
    const text = optionalText(body.query, '검색어', 100);
    if (text) {
      const like = `%${escapeLike(text.replace(/[(),]/g, ' '))}%`;
      const [members, products] = await Promise.all([
        db.from('users').select('id').ilike('nickname', like).limit(100),
        db
          .from('products')
          .select('id')
          .or(`name.ilike.${like},brand_name.ilike.${like}`)
          .limit(100),
      ]);
      const memberIds = checked(members) as { id: string }[],
        productIds = checked(products) as { id: string }[];
      const filters = [
        ...memberIds.map((r) => `user_id.eq.${r.id}`),
        ...productIds.map((r) => `product_id.eq.${r.id}`),
      ];
      if (!filters.length) return { ok: true, rows: [], total: 0 };
      query = query.or(filters.join(','));
    }
    const r = await query;
    checked(r);
    return { ok: true, rows: r.data ?? [], total: r.count ?? 0 };
  }
  throw new ValidationError('지원하지 않는 관리 작업입니다.');
}
