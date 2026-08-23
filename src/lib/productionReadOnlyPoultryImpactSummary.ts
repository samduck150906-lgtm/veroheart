import type {
  PoultrySyntheticProfileId,
  ProductionReadOnlyPoultrySignalMatrixReport,
  ProductionReadOnlyPoultrySignalRow,
} from './productionReadOnlyPoultrySignalMatrix';

export interface PoultryAffectedProductSummary {
  productId: string;
  productName: string;
  signal: 'hard' | 'caution';
  hardHits: string[];
  cautionKinds: string[];
  score: number | null;
  displayScore: number | null;
  allergyPenalty: number | null;
  allergyCautionPenalty: number | null;
  rankingPosition: number | null;
  scoreStatus: 'computed' | 'data_incomplete';
}

export interface PoultryProfileImpactSummary {
  profileId: PoultrySyntheticProfileId;
  allergyLabel: string;
  products: number;
  computedProducts: number;
  incompleteProducts: number;
  hardProducts: number;
  cautionOnlyProducts: number;
  noSignalComputedProducts: number;
  averageCautionPenalty: number;
  maxCautionPenalty: number;
  affectedProducts: PoultryAffectedProductSummary[];
}

export interface ProductionReadOnlyPoultryImpactSummaryReport {
  reportKind: 'production_read_only_poultry_impact_summary';
  profiles: PoultryProfileImpactSummary[];
  dataQuality: {
    reportReady: boolean;
    incompleteMatrixRows: number;
    productsMissingIngredientLinks: number;
    missingLinkedIngredients: number;
    invalidRiskLevelIngredients: number;
    warnings: string[];
  };
  safety: {
    readOnlyOnly: true;
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimePolicy: false;
    authorizesProductionChange: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
  };
}

function signalForRow(row: ProductionReadOnlyPoultrySignalRow): 'hard' | 'caution' | 'none' {
  if (row.hardHits.length > 0) return 'hard';
  if (row.cautionKinds.length > 0) return 'caution';
  return 'none';
}

function affectedSort(a: PoultryAffectedProductSummary, b: PoultryAffectedProductSummary): number {
  if (a.signal !== b.signal) return a.signal === 'hard' ? -1 : 1;
  const aPenalty = a.signal === 'hard' ? (a.allergyPenalty ?? 0) : (a.allergyCautionPenalty ?? 0);
  const bPenalty = b.signal === 'hard' ? (b.allergyPenalty ?? 0) : (b.allergyCautionPenalty ?? 0);
  if (aPenalty !== bPenalty) return bPenalty - aPenalty;
  return a.productName.localeCompare(b.productName, 'ko');
}

function profileSummary(
  profileRows: ProductionReadOnlyPoultrySignalRow[],
): PoultryProfileImpactSummary {
  const first = profileRows[0];
  const cautionRows = profileRows.filter((row) => signalForRow(row) === 'caution');
  const cautionPenalties = cautionRows
    .map((row) => row.allergyCautionPenalty)
    .filter((value): value is number => value !== null);

  const affectedProducts = profileRows
    .filter((row) => signalForRow(row) !== 'none')
    .map((row): PoultryAffectedProductSummary => ({
      productId: row.productId,
      productName: row.productName,
      signal: signalForRow(row) as 'hard' | 'caution',
      hardHits: row.hardHits,
      cautionKinds: row.cautionKinds,
      score: row.score,
      displayScore: row.displayScore,
      allergyPenalty: row.allergyPenalty,
      allergyCautionPenalty: row.allergyCautionPenalty,
      rankingPosition: row.rankingPosition,
      scoreStatus: row.scoreStatus,
    }))
    .sort(affectedSort);

  return {
    profileId: first?.profileId ?? 'chicken',
    allergyLabel: first?.allergyLabel ?? '',
    products: profileRows.length,
    computedProducts: profileRows.filter((row) => row.scoreStatus === 'computed').length,
    incompleteProducts: profileRows.filter((row) => row.scoreStatus === 'data_incomplete').length,
    hardProducts: profileRows.filter((row) => signalForRow(row) === 'hard').length,
    cautionOnlyProducts: cautionRows.length,
    noSignalComputedProducts: profileRows.filter(
      (row) => row.scoreStatus === 'computed' && signalForRow(row) === 'none',
    ).length,
    averageCautionPenalty:
      cautionPenalties.length > 0
        ? Math.round(
            (cautionPenalties.reduce((sum, value) => sum + value, 0) / cautionPenalties.length) * 100,
          ) / 100
        : 0,
    maxCautionPenalty: cautionPenalties.length > 0 ? Math.max(...cautionPenalties) : 0,
    affectedProducts,
  };
}

export function buildProductionReadOnlyPoultryImpactSummary(
  matrix: ProductionReadOnlyPoultrySignalMatrixReport,
): ProductionReadOnlyPoultryImpactSummaryReport {
  const profileIds: PoultrySyntheticProfileId[] = ['chicken', 'duck', 'turkey', 'poultry'];
  const profiles = profileIds.map((profileId) =>
    profileSummary(matrix.rows.filter((row) => row.profileId === profileId)),
  );

  const warnings: string[] = [];
  if (matrix.summary.incompleteRows > 0) {
    warnings.push(`${matrix.summary.incompleteRows}개 matrix row의 점수 계산에 필요한 원료 데이터가 불완전해요.`);
  }
  if (matrix.summary.productsMissingIngredientLinks > 0) {
    warnings.push(`${matrix.summary.productsMissingIngredientLinks}개 제품에 연결된 원료 행이 없어요.`);
  }
  if (matrix.summary.missingLinkedIngredients > 0) {
    warnings.push(`${matrix.summary.missingLinkedIngredients}개 product_ingredients 링크의 원료 행을 찾지 못했어요.`);
  }
  if (matrix.summary.invalidRiskLevelIngredients > 0) {
    warnings.push(`${matrix.summary.invalidRiskLevelIngredients}개 원료의 risk_level이 유효하지 않아요.`);
  }

  return {
    reportKind: 'production_read_only_poultry_impact_summary',
    profiles,
    dataQuality: {
      reportReady: warnings.length === 0,
      incompleteMatrixRows: matrix.summary.incompleteRows,
      productsMissingIngredientLinks: matrix.summary.productsMissingIngredientLinks,
      missingLinkedIngredients: matrix.summary.missingLinkedIngredients,
      invalidRiskLevelIngredients: matrix.summary.invalidRiskLevelIngredients,
      warnings,
    },
    safety: {
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimePolicy: false,
      authorizesProductionChange: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    },
  };
}
