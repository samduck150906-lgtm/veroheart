import type { Product } from '../types';
import type { Phase2AliasResolverInput } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { buildPhase2AliasResolverShadowReport } from './phase2AliasResolverShadowReport';
import { toPhase2AliasShadowResultEnvelope } from './phase2AliasResolverShadowResult';

export interface Phase2AliasResolverShadowExecutionInput {
  products: Product[];
  aliases: Phase2AliasResolverInput['aliases'];
  canonicals?: Phase2AliasResolverInput['canonicals'];
  blockedTerms?: Phase2AliasResolverInput['blockedTerms'];
  /** Test-only candidate switch. Runtime callers must keep this false or omitted. */
  testCandidateEnabled?: boolean;
}

export function buildPhase2AliasResolverShadowExecutionReport(
  input: Phase2AliasResolverShadowExecutionInput,
) {
  const envelopes = input.products.map((product) =>
    toPhase2AliasShadowResultEnvelope(
      resolveProductWithPhase2AliasAdapter({
        product,
        aliases: input.aliases,
        canonicals: input.canonicals,
        blockedTerms: input.blockedTerms,
        flags: { phase2AliasResolver: input.testCandidateEnabled === true },
      }),
    ),
  );

  return buildPhase2AliasResolverShadowReport(envelopes);
}
