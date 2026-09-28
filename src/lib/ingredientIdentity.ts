import { normalizeIngredientName } from '../analysis/normalize';
import type { IngredientProcessingForm } from './canonicalIngredientTypes';

export interface IngredientIdentityInput {
  family: string;
  part?: string | null;
  process?: IngredientProcessingForm | null;
}

/**
 * Builds a deterministic key only from reviewed dimensions.
 * It deliberately does not infer a family, part, or form from a fuzzy label.
 */
export function buildIngredientIdentityKey(input: IngredientIdentityInput): string {
  const family = normalizeIngredientName(input.family);
  if (!family) throw new Error('ingredient_family_required');
  const part = input.part ? normalizeIngredientName(input.part) : '';
  const process = normalizeIngredientName(input.process ?? 'unknown');
  return [family, part, process || 'unknown'].join('|');
}
