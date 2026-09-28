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
  const resolved = status ?? (knownIngredientCount > 0 ? 'ready' : 'unavailable');
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

export function analysisReadinessCopy(status: AnalysisReadinessStatus): string {
  if (status === 'partial') return '확인되지 않은 원료가 있어 부분 분석만 제공해요';
  if (status === 'blocked') return '원료 정보가 서로 달라 확인이 필요해요';
  if (status === 'unavailable') return '등록된 원료 정보가 없어요';
  return '원료 분석이 완료됐어요';
}
