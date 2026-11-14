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

export function canonicalIdentityKey(value: string): string {
  // Processing forms and chemical prefixes are significant. Do not strip 정육,
  // hydrolysis, oil, mineral valence or the contents of parentheses.
  return value.normalize('NFKC').toLowerCase().replace(/가루|파우더/g, '분말')
    .replace(/[\s()（）[\]{}*·•▪◦・,.。:_\-–—/\\]/g, '');
}

function strictKey(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/가루|파우더/g, '분말')
    .replace(/[\s()（）[\]{}*·•▪◦・,]/g, '');
}

export function matchCanonicalIngredients(
  items: ParsedIngredientLabelItem[],
  canonicals: MatchableCanonicalIngredient[],
): CanonicalIngredientMatch[] {
  const index = new Map<string, Set<string>>();
  for (const canonical of canonicals) {
    const terms = [canonical.canonicalName, canonical.normalizedKey ?? '', ...(canonical.aliases ?? [])];
    for (const term of terms) {
      if (!canonicalIdentityKey(term)) continue;
      for (const key of [`strict:${strictKey(term)}`,`loose:${canonicalIdentityKey(term)}`]) {
        const ids = index.get(key) ?? new Set<string>();
        ids.add(canonical.id);
        index.set(key, ids);
      }
    }
  }

  return items.map((item) => {
    const full = item.rawText.replace(/\d+(?:\.\d+)?\s*%/g, '');
    const candidates = [...(index.get(`strict:${strictKey(full)}`)
      ?? index.get(`loose:${canonicalIdentityKey(full)}`)
      ?? index.get(`strict:${strictKey(item.baseText)}`)
      ?? index.get(`loose:${canonicalIdentityKey(item.baseText)}`) ?? [])].sort();
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
