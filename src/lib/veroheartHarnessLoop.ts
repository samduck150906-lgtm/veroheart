export type HarnessAgentId =
  | 'data-auditor'
  | 'nutrition-policy'
  | 'allergy-safety'
  | 'scoring-regression'
  | 'product-impact'
  | 'review-gate';

export type HarnessTargetLayer =
  | 'dictionary'
  | 'parser'
  | 'allergy'
  | 'scoring'
  | 'display'
  | 'database'
  | 'ui'
  | 'deployment';

export type HarnessSurface =
  | 'score'
  | 'display_verdict'
  | 'allergy_hit'
  | 'ranking'
  | 'ui_copy'
  | 'product_ingredient_data'
  | 'supabase_write'
  | 'sql_migration'
  | 'env_deploy'
  | 'runtime_flag';

export type HarnessReviewStatus = 'pass' | 'warn' | 'fail' | 'not_applicable';
export type HarnessGateDecision = 'safe' | 'approval_required' | 'blocked';

export interface HarnessHypothesis {
  id: string;
  statement: string;
  targetLayer: HarnessTargetLayer;
  expectedPositiveCases: string[];
  expectedNegativeCases: string[];
  expectedUnchangedSurfaces: HarnessSurface[];
}

export interface HarnessAgentReview {
  agent: HarnessAgentId;
  status: HarnessReviewStatus;
  evidence: string[];
  changedSurfaces: HarnessSurface[];
  warnings?: string[];
  failures?: string[];
}

export interface HarnessRunInput {
  hypothesis: HarnessHypothesis;
  reviews: HarnessAgentReview[];
  semanticSafety: {
    collapsesPartsIntoOrdinaryMeat?: boolean;
    treatsUnknownAsSafe?: boolean;
    treatsUnknownAnimalByproductAsNamedSource?: boolean;
  };
}

export interface HarnessRunReport {
  hypothesisId: string;
  decision: HarnessGateDecision;
  changedSurfaces: HarnessSurface[];
  requiredApproval: string[];
  blockedReasons: string[];
  warnings: string[];
  missingAgents: HarnessAgentId[];
}

const REQUIRED_AGENTS: HarnessAgentId[] = [
  'data-auditor',
  'nutrition-policy',
  'allergy-safety',
  'scoring-regression',
  'product-impact',
  'review-gate',
];

const APPROVAL_SURFACES = new Set<HarnessSurface>([
  'score',
  'display_verdict',
  'allergy_hit',
  'ranking',
  'ui_copy',
  'product_ingredient_data',
  'supabase_write',
  'sql_migration',
  'env_deploy',
  'runtime_flag',
]);

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildVeroheartHarnessRunReport(input: HarnessRunInput): HarnessRunReport {
  const changedSurfaces = uniq(input.reviews.flatMap((review) => review.changedSurfaces));
  const missingAgents = REQUIRED_AGENTS.filter(
    (agent) => !input.reviews.some((review) => review.agent === agent),
  );

  const warnings = uniq([
    ...input.reviews.flatMap((review) => review.warnings ?? []),
    ...input.reviews
      .filter((review) => review.status === 'warn')
      .map((review) => `${review.agent}: warning status`),
    ...missingAgents.map((agent) => `${agent}: missing review`),
  ]);

  const blockedReasons = uniq([
    ...input.reviews.flatMap((review) => review.failures ?? []),
    ...input.reviews
      .filter((review) => review.status === 'fail')
      .map((review) => `${review.agent}: failed review`),
    ...(input.semanticSafety.collapsesPartsIntoOrdinaryMeat
      ? ['semantic safety: part/form collapsed into ordinary meat']
      : []),
    ...(input.semanticSafety.treatsUnknownAsSafe
      ? ['semantic safety: unknown treated as safe']
      : []),
    ...(input.semanticSafety.treatsUnknownAnimalByproductAsNamedSource
      ? ['semantic safety: unknown animal byproduct treated as named source']
      : []),
  ]);

  const requiredApproval = uniq(
    changedSurfaces
      .filter((surface) => APPROVAL_SURFACES.has(surface))
      .map((surface) => `${surface} change requires owner approval`),
  );

  const decision: HarnessGateDecision =
    blockedReasons.length > 0
      ? 'blocked'
      : requiredApproval.length > 0 || missingAgents.length > 0
        ? 'approval_required'
        : 'safe';

  return {
    hypothesisId: input.hypothesis.id,
    decision,
    changedSurfaces,
    requiredApproval,
    blockedReasons,
    warnings,
    missingAgents,
  };
}

export const VEROHEART_HARNESS_REQUIRED_AGENTS = REQUIRED_AGENTS;
