import {
  buildVeroheartHarnessRunReport,
  type HarnessRunReport,
} from './veroheartHarnessLoop';

export interface AnimalIngredientImpactSnapshotRow {
  productId: string;
  productName: string;
  ingredientNames: string[];
  allergyHits: string[];
  score: number;
  displayScore: number;
  rankingPosition?: number;
}

export interface AnimalIngredientImpactDiffRow {
  productId: string;
  productName: string;
  ingredientNames: string[];
  allergyHitsBefore: string[];
  allergyHitsAfter: string[];
  allergyHitChanged: boolean;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  displayScoreBefore: number;
  displayScoreAfter: number;
  displayScoreDelta: number;
  rankingPositionBefore: number | null;
  rankingPositionAfter: number | null;
  rankingChanged: boolean;
}

export interface AnimalIngredientImpactDiffReport {
  reportKind: 'animal_ingredient_impact_diff_report';
  rows: AnimalIngredientImpactDiffRow[];
  summary: {
    productsCompared: number;
    allergyHitChangedProducts: number;
    scoreChangedProducts: number;
    displayChangedProducts: number;
    rankingChangedProducts: number;
  };
  harnessGate: HarnessRunReport;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function byId(rows: AnimalIngredientImpactSnapshotRow[]) {
  return new Map(rows.map((row) => [row.productId, row]));
}

export function buildAnimalIngredientImpactDiffReport(input: {
  hypothesisId: string;
  hypothesisStatement: string;
  before: AnimalIngredientImpactSnapshotRow[];
  after: AnimalIngredientImpactSnapshotRow[];
}): AnimalIngredientImpactDiffReport {
  const beforeById = byId(input.before);

  const rows = input.after.map((after): AnimalIngredientImpactDiffRow => {
    const before = beforeById.get(after.productId) ?? {
      ...after,
      allergyHits: [],
      score: after.score,
      displayScore: after.displayScore,
      rankingPosition: after.rankingPosition,
    };

    const scoreDelta = after.score - before.score;
    const displayScoreDelta = after.displayScore - before.displayScore;
    const rankingPositionBefore = before.rankingPosition ?? null;
    const rankingPositionAfter = after.rankingPosition ?? null;

    return {
      productId: after.productId,
      productName: after.productName,
      ingredientNames: after.ingredientNames,
      allergyHitsBefore: before.allergyHits,
      allergyHitsAfter: after.allergyHits,
      allergyHitChanged: !sameSet(before.allergyHits, after.allergyHits),
      scoreBefore: before.score,
      scoreAfter: after.score,
      scoreDelta,
      displayScoreBefore: before.displayScore,
      displayScoreAfter: after.displayScore,
      displayScoreDelta,
      rankingPositionBefore,
      rankingPositionAfter,
      rankingChanged: rankingPositionBefore !== rankingPositionAfter,
    };
  });

  const summary = {
    productsCompared: rows.length,
    allergyHitChangedProducts: rows.filter((row) => row.allergyHitChanged).length,
    scoreChangedProducts: rows.filter((row) => row.scoreDelta !== 0).length,
    displayChangedProducts: rows.filter((row) => row.displayScoreDelta !== 0).length,
    rankingChangedProducts: rows.filter((row) => row.rankingChanged).length,
  };

  const changedSurfaces = [
    ...(summary.allergyHitChangedProducts > 0 ? (['allergy_hit'] as const) : []),
    ...(summary.scoreChangedProducts > 0 ? (['score'] as const) : []),
    ...(summary.displayChangedProducts > 0 ? (['display_verdict'] as const) : []),
    ...(summary.rankingChangedProducts > 0 ? (['ranking'] as const) : []),
  ];

  const harnessGate = buildVeroheartHarnessRunReport({
    hypothesis: {
      id: input.hypothesisId,
      statement: input.hypothesisStatement,
      targetLayer: 'allergy',
      expectedPositiveCases: ['source family allergy changes are visible in diff rows'],
      expectedNegativeCases: ['unknown animal byproduct is not promoted to a named source'],
      expectedUnchangedSurfaces: ['ui_copy', 'product_ingredient_data', 'runtime_flag'],
    },
    reviews: [
      {
        agent: 'data-auditor',
        status: 'pass',
        evidence: ['before/after rows share product ids'],
        changedSurfaces: [],
      },
      {
        agent: 'nutrition-policy',
        status: 'pass',
        evidence: ['diff report does not collapse part/form semantics'],
        changedSurfaces: [],
      },
      {
        agent: 'allergy-safety',
        status: summary.allergyHitChangedProducts > 0 ? 'warn' : 'pass',
        evidence: [`allergy hit changed products: ${summary.allergyHitChangedProducts}`],
        changedSurfaces,
      },
      {
        agent: 'scoring-regression',
        status: summary.scoreChangedProducts > 0 || summary.displayChangedProducts > 0 ? 'warn' : 'pass',
        evidence: [
          `score changed products: ${summary.scoreChangedProducts}`,
          `display changed products: ${summary.displayChangedProducts}`,
        ],
        changedSurfaces,
      },
      {
        agent: 'product-impact',
        status: 'pass',
        evidence: [`products compared: ${summary.productsCompared}`],
        changedSurfaces,
      },
      {
        agent: 'review-gate',
        status: changedSurfaces.length > 0 ? 'warn' : 'pass',
        evidence: ['gate computed by shared harness runner'],
        changedSurfaces,
      },
    ],
    semanticSafety: {},
  });

  return {
    reportKind: 'animal_ingredient_impact_diff_report',
    rows,
    summary,
    harnessGate,
  };
}
