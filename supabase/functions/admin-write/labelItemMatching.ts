import { requireUuid, requireText, ValidationError } from './validation.ts';

interface Db { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> }
const fields = {
  getLabelItemWorkspace: ['action', 'productId'],
  searchLabelItemCandidates: ['action', 'query'],
  reviewLabelItemMatch: ['action', 'productId', 'revision', 'itemId', 'decision', 'targetKind', 'targetId', 'targetRevision', 'reason'],
} as const;

/** Actor is supplied by the existing authenticated router, never by the body. */
export async function handleLabelItemMatching(db: Db, actor: string, action: string, body: Record<string, unknown>) {
  if (!actor) throw new ValidationError('관리자 인증이 필요합니다.');
  if (!(action in fields)) throw new ValidationError('지원하지 않는 라벨 항목 작업입니다.');
  const allowed: readonly string[] = fields[action as keyof typeof fields];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new ValidationError('허용되지 않은 라벨 항목 필드입니다.');
  let rpc: string;
  let args: Record<string, unknown>;
  if (action === 'searchLabelItemCandidates') {
    rpc = 'admin_search_label_item_candidates'; args = { p_query: requireText(body.query, '검색어', 100) };
  } else {
    const productId = requireUuid(body.productId, '제품 ID');
    if (action === 'getLabelItemWorkspace') {
      rpc = 'admin_get_label_item_workspace'; args = { p_product_id: productId };
    } else {
      const revision = requireText(body.revision, 'revision', 64);
      if (!/^[a-f0-9]{64}$/.test(revision)) throw new ValidationError('검토 revision이 올바르지 않습니다.');
      if (body.decision !== 'match' && body.decision !== 'hold') throw new ValidationError('매칭 또는 보류를 선택해 주세요.');
      const targetKind = body.decision === 'match' ? body.targetKind : null;
      if (body.decision === 'hold' && (body.targetKind != null || body.targetId != null || body.targetRevision != null)) throw new ValidationError('보류 항목에 원료를 지정할 수 없습니다.');
      if (body.decision === 'match' && targetKind !== 'canonical' && targetKind !== 'legacy') throw new ValidationError('원료 종류가 올바르지 않습니다.');
      const targetRevision = body.decision === 'match' ? requireText(body.targetRevision, '후보 revision', 64) : null;
      if (targetRevision !== null && !/^[a-f0-9]{64}$/.test(targetRevision)) throw new ValidationError('후보 revision이 올바르지 않습니다.');
      rpc = 'admin_review_label_item_match';
      args = { p_product_id: productId, p_revision: revision, p_item_id: requireUuid(body.itemId, '항목 ID'),
        p_decision: body.decision, p_target_kind: targetKind,
        p_target_id: body.decision === 'match' ? requireUuid(body.targetId, '원료 ID') : null,
        p_target_revision: targetRevision, p_reason: requireText(body.reason, '검토 근거 또는 보류 사유', 2000), p_actor: actor };
    }
  }
  const result = await db.rpc(rpc, args);
  if (result.error) {
    const conflict = result.error.code === '40001';
    return { status: conflict ? 409 : result.error.code === '22023' ? 400 : 503,
      body: { error: conflict ? '검토 자료가 변경됐습니다. 다시 조회해 주세요.' : '항목 검토를 처리하지 못했습니다. 재저장 전에 조회해 주세요.',
        code: conflict ? 'review_revision_conflict' : 'label_item_review_unavailable' } };
  }
  return { status: 200, body: { ok: true, result: result.data } };
}
