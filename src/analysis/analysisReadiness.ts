import type { Product } from '../types';
import { assessLabelCompleteness, labelProductIdentity, publicLabelBinding, LABEL_COMPARISON_NOTICE } from './labelCompleteness';

export type AnalysisReadinessStatus = 'unavailable' | 'partial' | 'ready' | 'blocked';

export interface AnalysisReadiness {
  status: AnalysisReadinessStatus;
  unknownCount: number;
  ambiguousCount: number;
  reasonCodes: string[];
}

export interface IngredientMatchState {
  matchStatus: 'unreviewed' | 'matched' | 'ambiguous' | 'unmatched' | 'ignored';
}

export function getAnalysisReadiness(items: IngredientMatchState[]): AnalysisReadiness {
  const considered = items.filter((item) => item.matchStatus !== 'ignored');
  const unknownCount = considered.filter((item) =>
    item.matchStatus === 'unmatched' || item.matchStatus === 'unreviewed').length;
  const ambiguousCount = considered.filter((item) => item.matchStatus === 'ambiguous').length;

  if (considered.length === 0) {
    return { status: 'unavailable', unknownCount: 0, ambiguousCount: 0, reasonCodes: ['no_label_items'] };
  }
  if (ambiguousCount > 0) {
    return {
      status: 'blocked',
      unknownCount,
      ambiguousCount,
      reasonCodes: [
        'ambiguous_ingredients',
        ...(unknownCount > 0 ? ['unknown_ingredients'] : []),
      ],
    };
  }
  if (unknownCount > 0) {
    return { status: 'partial', unknownCount, ambiguousCount: 0, reasonCodes: ['unknown_ingredients'] };
  }
  return { status: 'ready', unknownCount: 0, ambiguousCount: 0, reasonCodes: [] };
}

export function readinessFromStoredStatus(
  status: AnalysisReadinessStatus | undefined,
  knownIngredientCount: number,
  unknownIngredientCount = 0,
): AnalysisReadiness {
  const resolved = status === 'blocked' ? 'blocked'
    : unknownIngredientCount > 0 ? 'partial'
    : knownIngredientCount === 0 ? 'unavailable'
    : status ?? 'ready';
  if (resolved === 'ready') return { status: 'ready', unknownCount: 0, ambiguousCount: 0, reasonCodes: [] };
  if (resolved === 'partial') {
    return {
      status: 'partial',
      unknownCount: Math.max(1, unknownIngredientCount),
      ambiguousCount: 0,
      reasonCodes: ['unknown_ingredients'],
    };
  }
  if (resolved === 'blocked') {
    return {
      status: 'blocked',
      unknownCount: unknownIngredientCount,
      ambiguousCount: 1,
      reasonCodes: ['ambiguous_ingredients'],
    };
  }
  return { status: 'unavailable', unknownCount: 0, ambiguousCount: 0, reasonCodes: ['no_label_items'] };
}

/** Product-facing gate. The item-only engine helper above is not proof that a
 * complete label was captured. Numeric scores/rules are deliberately unchanged. */
export function productAnalysisReadiness(product: Product): AnalysisReadiness {
  const baseline = readinessFromStoredStatus(product.analysisStatus, product.ingredients?.length ?? 0, product.unknownIngredientTerms?.length ?? 0);
  const proof = assessLabelCompleteness(product.ingredientLabelEvidence);
  const items = product.ingredientLabelEvidence?.current?.items;
  const snapshot = product.ingredientLabelEvidence?.current;
  if (snapshot && (snapshot.productId !== product.id || snapshot.labelSetId !== product.ingredientLabelSetId
    || snapshot.productIdentity !== labelProductIdentity(product))) {
    return { ...baseline, status: 'blocked', reasonCodes: ['label_product_or_version_mismatch'] };
  }
  const matched = items ? getAnalysisReadiness(items) : null;
  if (proof.status === 'invalid' || proof.status === 'stale') return { ...baseline, status: 'blocked', reasonCodes: [proof.reason] };
  if (baseline.status === 'blocked' || matched?.status === 'blocked') return matched?.status === 'blocked' ? matched : baseline;
  if (product.ingredientDataLoaded === false) return { ...baseline, status: 'unavailable', reasonCodes: ['ingredient_data_not_loaded'] };
  if (baseline.status !== 'ready') return product.ingredientLabelEvidence?.lookup && proof.status !== 'verified'
    ? { ...baseline, reasonCodes: [...baseline.reasonCodes, proof.reason] } : baseline;
  if (matched && matched.status !== 'ready') return matched;
  if (proof.status !== 'verified') return { ...baseline, status: 'partial', reasonCodes: [proof.reason] };
  const lookup = product.ingredientLabelEvidence?.lookup;
  if (lookup?.status === 'loaded' && lookup.receipt) {
    const r = lookup.receipt;
    if (r.productId !== product.id || r.labelSetId !== product.ingredientLabelSetId
      || JSON.stringify(r.binding) !== JSON.stringify(publicLabelBinding(product)))
      return { ...baseline, status: 'partial', reasonCodes: ['label_projection_mismatch'] };
    return baseline;
  }
  const resolved = snapshot!.items.filter(i => i.matchStatus === 'matched').sort((a, b) => a.order - b.order);
  if (resolved.length !== product.ingredients.length || resolved.some((i, n) => {
    const ing = product.ingredients[n];
    return i.legacyId !== ing.id || i.canonicalId !== ing.canonicalIngredientId
      || i.resolvedName !== ing.nameKo || i.resolvedNameEn !== ing.nameEn
      || (i.riskLevel === 'warning' ? 'caution' : i.riskLevel) !== ing.riskLevel
      || (i.canonicalId && i.canonicalStatus !== 'active');
  })) return { ...baseline, status: 'blocked', reasonCodes: ['label_resolved_evidence_changed'] };
  return baseline;
}

export function analysisReadinessNotice(readiness: AnalysisReadiness): string {
  const reasons: Record<string, string> = {
    label_evidence_not_requested: '전성분 대조 증거를 아직 조회하지 않아 분석을 보류합니다.',
    label_evidence_unavailable: '전성분 대조 증거 조회 경로가 준비되지 않아 분석을 보류합니다.',
    label_evidence_error: '전성분 대조 증거를 불러오지 못해 분석을 보류합니다. 다시 조회해 주세요.',
    label_evidence_absent: '현재 라벨의 전체 대조 완료 증거가 없어 분석을 보류합니다.',
    label_evidence_stale: '제품·라벨·매칭 정보 변경으로 이전 대조 증거가 오래되어 재검토가 필요합니다.',
    label_evidence_blocked: '전성분 대조 정보에 충돌·미해결 항목이 있어 분석을 보류합니다.',
    label_projection_mismatch: '제품 조회와 대조 증거의 현재 버전이 대응하지 않아 분석을 보류합니다. 다시 조회해 주세요.',
  };
  for (const code of readiness.reasonCodes) if (reasons[code]) return reasons[code];
  return readiness.reasonCodes.some(r => r.startsWith('label_') || r === 'multiple_current_labels')
    ? LABEL_COMPARISON_NOTICE : analysisReadinessCopy(readiness.status);
}

export function analysisReadinessCopy(status: AnalysisReadinessStatus): string {
  if (status === 'partial') return '확인되지 않은 원료가 있어 부분 분석만 제공합니다';
  if (status === 'blocked') return '원료 정보가 서로 달라 확인이 필요합니다';
  if (status === 'unavailable') return '등록된 원료 정보가 없습니다';
  return '원료 분석이 완료되었습니다';
}
