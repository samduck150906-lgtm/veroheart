import type { Product } from '../types';

export function ingredientLabelCounts(product: Product) {
  return {
    declared: product.ingredientLabelEntries?.length ?? product.ingredients.length + (product.unknownIngredientTerms?.length ?? 0),
    sourceConfirmed: product.confirmedLabelIngredientCount,
    traitsResolved: product.ingredientLabelEntries?.filter(entry=>entry.traitResolved).length ?? product.ingredients.length,
  };
}
