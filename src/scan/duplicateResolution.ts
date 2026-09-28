import { normalizeBarcode } from '../lib/productIdentity';

export interface DuplicateCandidate {
  id: string;
  barcode: string | null;
  canonicalProductKey: string | null;
  similarity?: number;
}

export type DuplicateResolution =
  | { action: 'link'; productId: string; matchedBy: 'barcode' | 'canonical' }
  | { action: 'ambiguous'; candidateIds: string[] }
  | { action: 'review'; candidateIds: string[] }
  | { action: 'create' };

export function resolveProductDuplicate(
  identity: { barcode: string | null; canonicalProductKey: string | null },
  candidates: DuplicateCandidate[],
): DuplicateResolution {
  const barcode = identity.barcode ? normalizeBarcode(identity.barcode) : null;
  if (barcode) {
    const matches = candidates.filter((candidate) =>
      candidate.barcode ? normalizeBarcode(candidate.barcode) === barcode : false);
    if (matches.length === 1) return { action: 'link', productId: matches[0].id, matchedBy: 'barcode' };
    if (matches.length > 1) return { action: 'ambiguous', candidateIds: matches.map(({ id }) => id) };
  }

  if (identity.canonicalProductKey) {
    const matches = candidates.filter(
      (candidate) => candidate.canonicalProductKey === identity.canonicalProductKey,
    );
    if (matches.length === 1) return { action: 'link', productId: matches[0].id, matchedBy: 'canonical' };
    if (matches.length > 1) return { action: 'ambiguous', candidateIds: matches.map(({ id }) => id) };
  }

  const fuzzy = candidates.filter((candidate) => (candidate.similarity ?? 0) >= 0.2);
  return fuzzy.length > 0
    ? { action: 'review', candidateIds: fuzzy.map(({ id }) => id) }
    : { action: 'create' };
}
