/** A material is not a nutrient. These edges come from the relational registry. */
export interface MaterialConstituent {
  constituentCode: string;
  constituentName: string;
  nutrientCode: string;
  nutrientName: string;
  relation: 'contains' | 'source_of';
  sourceUrl: string;
  sourceVersion: string;
  /** Reference material composition, never the finished product guarantee. */
  amount: number | null;
  unit: 'g/100g' | 'mg/kg' | null;
  basis: 'as_fed' | 'dry_matter' | null;
}

export interface MaterialNutrientReference {
  nutrientCode: string; name: string; value: number;
  unit: 'g/100g' | 'mg/kg' | 'Mcal/kg' | '1000IU/kg';
  basis: 'as_fed' | 'dry_matter';
  sourceUrl: string; sourceVersion: string; sourceSha256: string; sourceLocator: string;
  quality: 'reference' | 'inconsistent'; qualityNote: string;
}

export function estimateReferenceContribution(inclusionPercent: number | undefined, reference: MaterialNutrientReference) {
  if (reference.quality !== 'reference' || reference.unit === 'Mcal/kg' || reference.unit === '1000IU/kg') return null;
  return estimateMaterialContribution(inclusionPercent, {
    constituentCode: reference.nutrientCode, constituentName: reference.name,
    nutrientCode: reference.nutrientCode, nutrientName: reference.name, relation: 'contains',
    sourceUrl: reference.sourceUrl, sourceVersion: reference.sourceVersion,
    amount: reference.value, unit: reference.unit, basis: reference.basis,
  });
}

export function materialNutrientRoles(edges: MaterialConstituent[] = []): string[] {
  return [...new Set(edges.map((edge) => `${edge.constituentName} → ${edge.nutrientName}`))];
}

export function materialTraitLabel(edges: MaterialConstituent[] = [], fallback = ''): string {
  if (edges.some(edge => edge.nutrientCode.startsWith('vitamin_'))) return '비타민류(첨가 영양소)';
  const nutrients = [...new Set(edges.map(edge => edge.nutrientName))];
  return nutrients.length ? `${nutrients.join('·')} 공급원` : fallback || '원료 특성 설명 준비 중';
}

/** Only a declared recipe fraction and an exact material reference can be combined.
 * The result remains an estimate: processing loss and batch variation are unknown.
 * Missing fractions/composition are never interpreted as zero. */
export function estimateMaterialContribution(
  inclusionPercent: number | null | undefined,
  edge: MaterialConstituent,
): { nutrientCode: string; gramsPer100g: number; kind: 'reference_estimate'; sourceUrl: string } | null {
  if (typeof inclusionPercent !== 'number' || !Number.isFinite(inclusionPercent)
    || inclusionPercent < 0 || inclusionPercent > 100 || edge.basis !== 'as_fed'
    || edge.amount === null || !Number.isFinite(edge.amount) || edge.amount < 0) return null;
  const grams = edge.unit === 'g/100g' ? edge.amount
    : edge.unit === 'mg/kg' ? edge.amount / 10000 : null;
  if (grams === null || grams > 100) return null;
  return { nutrientCode: edge.nutrientCode, gramsPer100g: inclusionPercent * grams / 100,
    kind: 'reference_estimate', sourceUrl: edge.sourceUrl };
}
