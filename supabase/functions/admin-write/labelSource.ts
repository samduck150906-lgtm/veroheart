import { parseIngredientLabelItems } from '../_shared/labelIngredientParser.ts';
import { requireUuid, requireText, ValidationError } from './validation.ts';
interface Db { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> }
export interface SourceItem { rawText: string; section: 'ingredients' | 'additives' | 'unresolved' }
export interface LabelSourcePayload {
  rawText: string; sourceType: 'manufacturer' | 'package_image' | 'manual' | 'import' | 'other';
  sourceReference: string; observedAt: string; identityNotes: string; reason: string;
  items: SourceItem[]; stage: 'draft' | 'held'; holdReason: string;
}
/** Segmentation is a draft proposal, never proof of complete transcription or SKU identity. */
export function sourceDraftIssues(payload: LabelSourcePayload): string[] {
  const issues: string[] = [];
  const stack: string[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '（': '）', '［': '］', '｛': '｝', '【': '】' };
  for (const c of payload.rawText) {
    if (pairs[c]) stack.push(pairs[c]);
    else if (Object.values(pairs).includes(c) && stack.pop() !== c) issues.push('괄호 대응을 확인해 주세요.');
  }
  if (stack.length) issues.push('닫히지 않은 괄호가 있습니다.');
  let parsed: ReturnType<typeof parseIngredientLabelItems>;
  try { parsed = parseIngredientLabelItems(payload.rawText); } catch { return [...new Set([...issues,'항목 초안이 100개를 초과합니다. 원문을 자르지 말고 보류하세요.'])]; }
  if (!parsed.length || parsed.length !== payload.items.length || parsed.some((p, n) => p.rawText !== payload.items[n]?.rawText)) issues.push('원문과 항목 분리안이 다릅니다. 해석 불가 구간을 보류해 주세요.');
  if (payload.items.some(i => i.section === 'unresolved')) issues.push('해석 미확정 항목이 있습니다.');
  if (/(?:^|\n)\s*(?:영양(?:정보|성분)|보증성분|급여(?:량|방법)|주의사항)\s*[:：]/u.test(payload.rawText)) issues.push('영양표·급여법·주의사항을 원재료 원문과 구분해 주세요.');
  return [...new Set(issues)];
}
function payloadOf(value: unknown): LabelSourcePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('라벨 초안이 필요합니다.');
  const p = value as LabelSourcePayload;
  const keys = ['rawText','sourceType','sourceReference','observedAt','identityNotes','reason','items','stage','holdReason'];
  if (Object.keys(p).length !== keys.length || Object.keys(p).some(k => !keys.includes(k))) throw new ValidationError('허용되지 않은 라벨 필드입니다.');
  for (const [key, max] of [['rawText',30000],['sourceReference',2000],['identityNotes',2000],['reason',2000]] as const) requireText(p[key],key,max);
  if (!['manufacturer','package_image','manual','import','other'].includes(p.sourceType) || !['draft','held'].includes(p.stage)) throw new ValidationError('출처 또는 보류 상태가 올바르지 않습니다.');
  if (typeof p.holdReason !== 'string' || p.holdReason.length > 2000) throw new ValidationError('보류 사유가 올바르지 않습니다.');
  if (p.stage === 'held') requireText(p.holdReason,'보류 사유',2000);
  // Private package references or a public clean URL; no credentials/signed query strings.
  if (!/^package:[A-Za-z0-9._/-]{1,180}$/.test(p.sourceReference)) {
    let url: URL; try { url = new URL(p.sourceReference); } catch { throw new ValidationError('공개 HTTPS 또는 package:사진참조를 입력해 주세요.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new ValidationError('비밀값·서명·검색 매개변수가 없는 공개 출처만 입력해 주세요.');
  }
  if (typeof p.observedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(p.observedAt)
    || !Number.isFinite(Date.parse(p.observedAt)) || Date.parse(p.observedAt) > Date.now()+300000 || Date.parse(p.observedAt) < Date.UTC(2000,0,1)) throw new ValidationError('실제 확인 시점과 시간대를 입력해 주세요.');
  if (!Array.isArray(p.items) || p.items.length > 100 || (p.stage === 'draft' && !p.items.length)) throw new ValidationError('항목은 최대 100개입니다.');
  for (const i of p.items) {
    if (!i || Object.keys(i).length !== 2 || Object.keys(i).some(k => !['rawText','section'].includes(k)) || !['ingredients','additives','unresolved'].includes(i.section)) throw new ValidationError('항목 구역이 올바르지 않습니다.');
    requireText(i.rawText,'원문 항목',2000);
  }
  const issues = sourceDraftIssues(p);
  if (issues.length && p.stage !== 'held') throw new ValidationError(issues.join(' '));
  return p; // Preserve original Unicode/line breaks; validation never normalizes stored text.
}
export async function handleLabelSource(db: Db, actor: string, action: string, body: Record<string, unknown>) {
  if (!actor) throw new ValidationError('관리자 인증이 필요합니다.');
  const read = action === 'getLabelSourceWorkspace';
  if (!read && action !== 'registerIngredientLabelSource') throw new ValidationError('지원하지 않는 작업입니다.');
  const allowed = read ? ['action','productId'] : ['action','productId','revision','labelSetId','payload'];
  if (Object.keys(body).some(k => !allowed.includes(k))) throw new ValidationError('허용되지 않은 등록 필드입니다.');
  const args: Record<string, unknown> = { p_product_id: requireUuid(body.productId,'제품 ID') };
  if (!read) {
    const revision = requireText(body.revision,'revision',64);
    if (!/^[a-f0-9]{64}$/.test(revision)) throw new ValidationError('revision이 올바르지 않습니다.');
    Object.assign(args, { p_revision: revision, p_label_set_id: body.labelSetId === null ? null : requireUuid(body.labelSetId,'라벨 ID'), p_payload: payloadOf(body.payload), p_actor: actor });
  }
  const result = await db.rpc(read ? 'admin_get_label_source_workspace' : 'admin_register_label_source',args);
  if (result.error) return { status: result.error.code === '40001' ? 409 : result.error.code === '22023' ? 400 : 503,
    body: { error: '라벨 처리 결과를 확인할 수 없습니다. 다시 저장하지 말고 최신 자료·감사를 조회해 주세요.', code: result.error.code === '40001' ? 'source_revision_conflict' : 'label_source_unavailable' } };
  return { status: 200, body: { ok: true, result: result.data } };
}
