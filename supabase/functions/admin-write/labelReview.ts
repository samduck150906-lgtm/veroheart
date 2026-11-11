import { parseIngredientLabelItems } from '../_shared/labelIngredientParser.ts';
import { requireUuid, requireText, ValidationError } from './validation.ts';

export interface ReviewSnapshot {
  product: unknown[];
  labels: Array<{ id: string; raw: string; source?: string; items: Array<{ id: string; order: number; raw: string; match: string }> }>;
}
export interface LabelReviewBundle { snapshot: ReviewSnapshot; revision: string; eligible: boolean }
interface Db { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> }

/** Authenticated router supplies actor. Never accept reviewer identity/snapshot/hash as approval. */
export async function handleLabelReview(db: Db, actor: string, action: string, body: Record<string, unknown>) {
  if (!actor) throw new ValidationError('관리자 인증이 필요합니다.');
  const productId = requireUuid(body.productId, 'productId');
  const current = await db.rpc('admin_get_label_comparison_review', { p_product_id: productId });
  if (current.error || !current.data) return { status: 503, body: { error: '라벨 검토 자료를 조회하지 못했습니다.' } };
  const bundle = current.data as LabelReviewBundle;
  if (action === 'getIngredientLabelReview') return { status: 200, body: { ok: true, review: bundle } };
  if (body.revision !== bundle.revision) return { status: 409, body: { error: '검토 중 자료가 변경됐습니다. 다시 조회해 주세요.', code: 'review_revision_conflict' } };
  const label = bundle.snapshot.labels[0];
  if (!bundle.eligible || bundle.snapshot.labels.length !== 1 || !label) throw new ValidationError('미매칭·충돌 항목을 먼저 해결해야 합니다.');
  // Reuse the ingestion parser, comparing each exact ordered token, not just
  // counts. Human source/package/full transcription review remains mandatory.
  const parsed = parseIngredientLabelItems(label.raw);
  const ordered = [...label.items].sort((a, b) => a.order - b.order);
  if (!parsed.length || parsed.length !== ordered.length || parsed.some((p, n) => p.rawText !== ordered[n].raw)) {
    throw new ValidationError('원문과 저장된 항목이 대응하지 않습니다. 라벨을 다시 검토해 주세요.');
  }
  const ids = ordered.map(i => i.id);
  if (!Array.isArray(body.reviewedItemIds) || JSON.stringify(body.reviewedItemIds) !== JSON.stringify(ids)
    || body.identityConfirmed !== true || body.wholeLabelCompared !== true) throw new ValidationError('모든 항목과 제품·포장 대응을 직접 확인해 주세요.');
  const observation = { identityConfirmed: true, wholeLabelCompared: true,
    sourceReference: requireText(body.sourceReference, 'sourceReference', 2000),
    identityNotes: requireText(body.identityNotes, 'identityNotes', 2000),
    coverageNotes: requireText(body.coverageNotes, 'coverageNotes', 2000) };
  const result = await db.rpc('admin_approve_label_comparison', { p_product_id: productId,
    p_revision: bundle.revision, p_item_ids: ids, p_observation: observation, p_actor: actor });
  if (result.error) return { status: result.error.code === '40001' ? 409 : 503,
    body: { error: '검토 승인에 실패했습니다. 재전송 전에 조회해 주세요.', code: result.error.code === '40001' ? 'review_revision_conflict' : 'review_unavailable' } };
  return { status: 200, body: { ok: true, result: result.data } };
}
