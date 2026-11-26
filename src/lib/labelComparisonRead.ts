import type { Product } from '../types';
import type { PublicLabelReceipt } from '../analysis/labelCompleteness';

interface Result { data: unknown; error?: { code?: string } | null }
export async function loadLabelComparisons(products: Product[], read: (ids: string[]) => PromiseLike<Result>): Promise<Product[]> {
  const result: Product[] = [];
  for (let n = 0; n < products.length; n += 100) {
    const batch = products.slice(n, n + 100);
    let receipts: PublicLabelReceipt[] = []; let state: 'loaded' | 'unavailable' | 'error' = 'error';
    try {
      const response = await read(batch.map(p => p.id));
      if (response.error) state = ['PGRST202', '42883', '42P01'].includes(response.error.code ?? '') ? 'unavailable' : 'error';
      else if (Array.isArray(response.data)) { receipts = response.data; state = 'loaded'; }
    } catch { /* Never turn missing/failed evidence into an absent review. */ }
    for (const product of batch) {
      const matches = receipts.filter(r => r?.productId === product.id);
      const candidate = matches.length === 1 ? matches[0] : undefined;
      const receipt = candidate && ['absent','blocked','stale','verified'].includes(candidate.state)
        && typeof candidate.revision === 'string' && candidate.revision.length > 0
        && (candidate.labelSetId === null || typeof candidate.labelSetId === 'string')
        && Array.isArray(candidate.binding)
        ? { productId:candidate.productId, state:candidate.state, labelSetId:candidate.labelSetId,
          revision:candidate.revision, binding:candidate.binding } : undefined;
      result.push({ ...product, ingredientLabelEvidence: { ...product.ingredientLabelEvidence,
        lookup: { status: state === 'loaded' && !receipt ? 'error' : state, receipt } } });
    }
  }
  return result;
}
