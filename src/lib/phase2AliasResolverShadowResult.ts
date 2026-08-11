import type { Product } from '../types';
import type { Phase2AliasProductAdapterResult } from './phase2AliasResolverProductAdapter';
import {
  summarizePhase2AliasShadowMetadataRows,
  toPhase2AliasShadowMetadataRows,
  type Phase2AliasResolverShadowMetadataRow,
  type Phase2AliasResolverShadowMetadataSummary,
} from './phase2AliasResolverShadowMetadata';

export type Phase2AliasShadowRunMode = 'disabled' | 'test_candidate_shadow';

export interface Phase2AliasResolverShadowRunMetadata {
  runMode: Phase2AliasShadowRunMode;
  resolverEnabled: boolean;
  source: 'phase2_alias_resolver_adapter_sidecar';
  scoreImpactAllowed: false;
  runtimeMutationAllowed: false;
  visibleLabelReplacementAllowed: false;
}

export interface Phase2AliasResolverShadowResultEnvelope {
  productId: Product['id'];
  productName: Product['name'];
  adapterReason: Phase2AliasProductAdapterResult['reason'];
  changed: false;
  metadata: Phase2AliasResolverShadowRunMetadata;
  rows: Phase2AliasResolverShadowMetadataRow[];
  summary: Phase2AliasResolverShadowMetadataSummary;
}

function resolveRunMode(adapterResult: Phase2AliasProductAdapterResult): Phase2AliasShadowRunMode {
  return adapterResult.enabled ? 'test_candidate_shadow' : 'disabled';
}

export function toPhase2AliasShadowResultEnvelope(
  adapterResult: Phase2AliasProductAdapterResult,
): Phase2AliasResolverShadowResultEnvelope {
  const rows = toPhase2AliasShadowMetadataRows(adapterResult.resolutions);
  const summary = summarizePhase2AliasShadowMetadataRows(rows);

  return {
    productId: adapterResult.product.id,
    productName: adapterResult.product.name,
    adapterReason: adapterResult.reason,
    changed: false,
    metadata: {
      runMode: resolveRunMode(adapterResult),
      resolverEnabled: adapterResult.enabled,
      source: 'phase2_alias_resolver_adapter_sidecar',
      scoreImpactAllowed: false,
      runtimeMutationAllowed: false,
      visibleLabelReplacementAllowed: false,
    },
    rows,
    summary,
  };
}
