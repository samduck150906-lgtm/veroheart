import type { Phase2AliasResolverShadowResultEnvelope } from './phase2AliasResolverShadowResult';

export interface Phase2AliasResolverShadowReportSummary {
  products: number;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  blockedRows: number;
  ambiguousRows: number;
  reviewRequiredRows: number;
  sidecarOnlyRows: number;
  scoreImpactAllowedRows: 0;
  runtimeMutationAllowedRows: 0;
  visibleLabelReplacementAllowedRows: 0;
  changedProducts: 0;
}

export interface Phase2AliasResolverShadowReport {
  reportKind: 'phase2_alias_resolver_shadow_report';
  visibility: 'non_visible_internal_report';
  scoreImpactAllowed: false;
  runtimeMutationAllowed: false;
  visibleLabelReplacementAllowed: false;
  envelopes: Phase2AliasResolverShadowResultEnvelope[];
  summary: Phase2AliasResolverShadowReportSummary;
}

export function buildPhase2AliasResolverShadowReport(
  envelopes: Phase2AliasResolverShadowResultEnvelope[],
): Phase2AliasResolverShadowReport {
  const totalRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.totalRows, 0);
  const matchedRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.matchedRows, 0);
  const unmatchedRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.unmatchedRows, 0);
  const blockedRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.blockedRows, 0);
  const ambiguousRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.ambiguousRows, 0);
  const reviewRequiredRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.reviewRequiredRows, 0);
  const sidecarOnlyRows = envelopes.reduce((sum, envelope) => sum + envelope.summary.sidecarOnlyRows, 0);

  return {
    reportKind: 'phase2_alias_resolver_shadow_report',
    visibility: 'non_visible_internal_report',
    scoreImpactAllowed: false,
    runtimeMutationAllowed: false,
    visibleLabelReplacementAllowed: false,
    envelopes,
    summary: {
      products: envelopes.length,
      totalRows,
      matchedRows,
      unmatchedRows,
      blockedRows,
      ambiguousRows,
      reviewRequiredRows,
      sidecarOnlyRows,
      scoreImpactAllowedRows: 0,
      runtimeMutationAllowedRows: 0,
      visibleLabelReplacementAllowedRows: 0,
      changedProducts: 0,
    },
  };
}
