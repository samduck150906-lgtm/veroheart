/** Whole-label comparison is not inferred from counts, URLs or stored ready. */
export interface LabelSnapshot {
  productId: string;
  labelSetId: string;
  productIdentity?: string;
  rawText?: string;
  revision?: string;
  items: Array<{
    id?: string;
    order: number;
    rawText: string;
    matchStatus: 'unreviewed' | 'matched' | 'ambiguous' | 'unmatched' | 'ignored';
    legacyId?: string;
    canonicalId?: string;
    canonicalStatus?: string;
    riskLevel?: string;
    resolvedName?: string;
    resolvedNameEn?: string;
  }>;
}
export interface LabelComparison {
  /** Future permissioned review adapter only; not an unauthenticated claim. */
  scope: 'whole_label';
  productIdentityConfirmed: true;
  completeLabelCompared: true;
  sourceEvidenceId: string;
  reviewedAt: string;
  snapshot: LabelSnapshot;
}
export interface PublicLabelReceipt {
  productId: string;
  state: 'absent' | 'blocked' | 'stale' | 'verified';
  labelSetId: string | null;
  revision: string;
  /** Only fields already present in the public analysis input; no whole raw label/source/reviewer. */
  binding: unknown[];
}
export interface IngredientLabelEvidence {
  lookup?: { status: 'not_requested' | 'unavailable' | 'error' | 'loaded'; receipt?: PublicLabelReceipt };
  current?: LabelSnapshot;
  multipleCurrent?: boolean;
  comparison?: LabelComparison;
}
export type LabelCompleteness = { status: 'unverified' | 'verified' | 'invalid' | 'stale'; reason: string };
function snapshotKey(s: LabelSnapshot): string {
  return JSON.stringify([s.productId, s.productIdentity, s.labelSetId, s.rawText, s.revision,
    [...s.items].sort((a, b) => a.order - b.order).map(i => [i.id, i.order, i.rawText,
      i.matchStatus, i.legacyId, i.canonicalId, i.canonicalStatus, i.riskLevel, i.resolvedName, i.resolvedNameEn])]);
}
export function assessLabelCompleteness(e?: IngredientLabelEvidence): LabelCompleteness {
  if (e?.multipleCurrent) return { status: 'invalid', reason: 'multiple_current_labels' };
  if (e?.lookup) {
    const { status, receipt } = e.lookup;
    if (status !== 'loaded') return { status: 'unverified', reason: `label_evidence_${status}` };
    if (!receipt || !['absent','blocked','stale','verified'].includes(receipt.state) || typeof receipt.revision !== 'string'
      || !receipt.revision || !Array.isArray(receipt.binding)) return { status: 'unverified', reason: 'label_evidence_error' };
    if (receipt.state === 'verified') return { status: 'verified', reason: 'whole_label_comparison' };
    return { status: receipt.state === 'blocked' ? 'invalid' : receipt.state === 'stale' ? 'stale' : 'unverified', reason: `label_evidence_${receipt.state}` };
  }
  const current = e?.current;
  if (!current) return { status: 'unverified', reason: 'label_comparison_missing' };
  if (!Array.isArray(current.items)) return { status: 'invalid', reason: 'label_items_invalid' };
  const orders = current.items.map(i => i.order);
  const ids = current.items.flatMap(i => i.id ? [i.id] : []);
  // Duplicate names/compound names and gaps in valid display_order are allowed.
  if (orders.some(n => !Number.isInteger(n) || n < 0) || new Set(orders).size !== orders.length
    || new Set(ids).size !== ids.length) return { status: 'invalid', reason: 'label_item_identity_or_order' };
  const c = e?.comparison;
  if (!c || c.scope !== 'whole_label' || c.completeLabelCompared !== true || c.productIdentityConfirmed !== true
    || typeof c.sourceEvidenceId !== 'string' || !c.sourceEvidenceId.trim()
    || !Number.isFinite(Date.parse(c.reviewedAt)) || !c.snapshot || !Array.isArray(c.snapshot.items)) {
    return { status: 'unverified', reason: 'label_comparison_missing' };
  }
  if (!current.productId || !current.productIdentity || !current.labelSetId || !current.rawText?.trim() || !current.revision
    || !current.items.length || current.items.some(i => !i.id || !i.rawText.trim())) {
    return { status: 'unverified', reason: 'label_snapshot_incomplete' };
  }
  if (snapshotKey(current) !== snapshotKey(c.snapshot)) return { status: 'stale', reason: 'label_comparison_stale' };
  return { status: 'verified', reason: 'whole_label_comparison' };
}
export const LABEL_COMPARISON_NOTICE = '전성분 라벨 전체 대조 근거가 확인되지 않아 종합 점수·등급 판정을 보류합니다.';

export function labelProductIdentity(p: { id: string; name: string; brand: string; variantName?: string; netWeightText?: string; barcode?: string; targetPetType?: string; targetLifeStage?: string[]; category?: string; formulation?: string }): string {
  return JSON.stringify([p.id, p.name, p.brand, p.variantName ?? null, p.netWeightText ?? null, p.barcode ?? null, p.targetPetType ?? null, p.targetLifeStage ?? null, p.category ?? null, p.formulation ?? null]);
}

export function publicLabelBinding(p: import('../types').Product): unknown[] {
  return [JSON.parse(labelProductIdentity(p)), p.ingredients.map(i => [i.id, i.canonicalIngredientId ?? null,
    i.nameKo, i.nameEn, i.riskLevel, i.rawLabelText ?? null])];
}
