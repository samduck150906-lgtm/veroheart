import type { Ingredient, Product } from '../types';
import type { Phase2AliasResolverInput } from './phase2AliasResolver';
import {
  resolvePhase2AliasBehindFeatureFlag,
  type Phase2AliasResolverFeatureFlags,
  type Phase2AliasResolverFlaggedDecision,
} from './phase2AliasResolverFeatureFlag';

export interface Phase2AliasProductAdapterInput {
  product: Product;
  aliases: Phase2AliasResolverInput['aliases'];
  canonicals?: Phase2AliasResolverInput['canonicals'];
  blockedTerms?: Phase2AliasResolverInput['blockedTerms'];
  flags?: Phase2AliasResolverFeatureFlags;
}

export interface Phase2AliasIngredientResolution {
  ingredientId: Ingredient['id'];
  rawNameKo: Ingredient['nameKo'];
  decision: Phase2AliasResolverFlaggedDecision;
}

export interface Phase2AliasProductAdapterResult {
  /** The current scaffold never mutates or replaces the product. */
  product: Product;
  enabled: boolean;
  changed: false;
  resolutions: Phase2AliasIngredientResolution[];
  reason:
    | 'feature_flag_disabled'
    | 'candidate_sidecar_only_no_runtime_change'
    | 'no_ingredients_no_runtime_change';
}

/**
 * Isolated product adapter prototype for Phase 2 alias resolver wiring.
 *
 * This is not imported by runtime/scoring surfaces. It exists to prove that a
 * future adapter can live behind the disabled flag without mutating Product data
 * or changing score inputs while the flag is off.
 */
export function resolveProductWithPhase2AliasAdapter(
  input: Phase2AliasProductAdapterInput,
): Phase2AliasProductAdapterResult {
  const enabled = input.flags?.phase2AliasResolver === true;

  if (!enabled) {
    return {
      product: input.product,
      enabled: false,
      changed: false,
      resolutions: [],
      reason: 'feature_flag_disabled',
    };
  }

  const ingredients = input.product.ingredients ?? [];
  if (ingredients.length === 0) {
    return {
      product: input.product,
      enabled: true,
      changed: false,
      resolutions: [],
      reason: 'no_ingredients_no_runtime_change',
    };
  }

  const resolutions = ingredients.map<Phase2AliasIngredientResolution>((ingredient) => ({
    ingredientId: ingredient.id,
    rawNameKo: ingredient.nameKo,
    decision: resolvePhase2AliasBehindFeatureFlag({
      label: ingredient.nameKo,
      aliases: input.aliases,
      canonicals: input.canonicals,
      blockedTerms: input.blockedTerms,
      flags: input.flags,
    }),
  }));

  return {
    product: input.product,
    enabled: true,
    changed: false,
    resolutions,
    reason: 'candidate_sidecar_only_no_runtime_change',
  };
}
