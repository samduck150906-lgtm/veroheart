import { normalizeIngredientName } from './normalize';
import type { ParsedIngredientLabelItem } from './labelIngredientParser';

export interface MatchableCanonicalIngredient {
  id: string;
  canonicalName: string;
  normalizedKey?: string | null;
  aliases?: string[];
}

export type CanonicalIngredientMatch = ParsedIngredientLabelItem & (
  | { matchStatus: 'matched'; canonicalIngredientId: string; candidateCanonicalIds: [string] }
  | { matchStatus: 'ambiguous'; canonicalIngredientId: null; candidateCanonicalIds: string[] }
  | { matchStatus: 'unmatched'; canonicalIngredientId: null; candidateCanonicalIds: [] }
);

function exactKey(value: string): string {
  return normalizeIngredientName(value).replace(/[.。:_\-–—/\\]/g, '');
}

export function matchCanonicalIngredients(
  items: ParsedIngredientLabelItem[],
  canonicals: MatchableCanonicalIngredient[],
): CanonicalIngredientMatch[] {
  const index = new Map<string, Set<string>>();
  for (const canonical of canonicals) {
    const terms = [canonical.canonicalName, canonical.normalizedKey ?? '', ...(canonical.aliases ?? [])];
    for (const term of terms) {
      const key = exactKey(term);
      if (!key) continue;
      const ids = index.get(key) ?? new Set<string>();
      ids.add(canonical.id);
      index.set(key, ids);
    }
  }

  return items.map((item) => {
    const candidates = [...(index.get(exactKey(item.baseText)) ?? [])].sort();
    if (candidates.length === 1) {
      return {
        ...item,
        matchStatus: 'matched' as const,
        canonicalIngredientId: candidates[0],
        candidateCanonicalIds: [candidates[0]],
      };
    }
    if (candidates.length > 1) {
      return {
        ...item,
        matchStatus: 'ambiguous' as const,
        canonicalIngredientId: null,
        candidateCanonicalIds: candidates,
      };
    }
    return {
      ...item,
      matchStatus: 'unmatched' as const,
      canonicalIngredientId: null,
      candidateCanonicalIds: [],
    };
  });
}
