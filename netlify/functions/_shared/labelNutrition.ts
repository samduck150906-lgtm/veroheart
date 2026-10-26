import type { ExtractedProductLabel } from '../../../src/scan/types';

type Nutrient = 'crude_protein' | 'crude_fat' | 'crude_fiber' | 'crude_ash' | 'moisture' | 'calcium' | 'phosphorus';
const NAMES: Record<string, Nutrient> = {
  조단백질: 'crude_protein', crudeprotein: 'crude_protein',
  조지방: 'crude_fat', crudefat: 'crude_fat',
  조섬유: 'crude_fiber', crudefiber: 'crude_fiber', crudefibre: 'crude_fiber',
  조회분: 'crude_ash', crudeash: 'crude_ash', ash: 'crude_ash',
  수분: 'moisture', moisture: 'moisture',
  칼슘: 'calcium', calcium: 'calcium', 인: 'phosphorus', phosphorus: 'phosphorus',
};
const ENERGY_NAMES = new Set(['대사에너지', '열량', '칼로리', '에너지', 'metabolizableenergy', 'metabolisableenergy', 'calories', 'energy', 'me']);
const normalized = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, '');

/** Only explicitly labelled percentages and energy units enter runtime nutrition.
 * The full original components (including bounds/unknown terms) stay in the scan.
 * Conflicting reported values remain unknown instead of choosing one arbitrarily.
 */
export function mapConfirmedLabelNutrition(label: Pick<ExtractedProductLabel, 'guaranteedComponents' | 'registeredComponents'>) {
  const values = new Map<Nutrient | 'kcal', Set<number>>();
  for (const component of [...label.guaranteedComponents, ...label.registeredComponents]) {
    if (typeof component.value !== 'number' || !Number.isFinite(component.value) || component.value < 0) continue;
    const name = normalized(component.name);
    const unit = normalized(component.unit ?? '');
    const nutrient = NAMES[name];
    let key: Nutrient | 'kcal';
    let value: number;
    if (nutrient && unit === '%' && component.value <= 100) {
      key = nutrient;
      value = component.value;
    } else if (ENERGY_NAMES.has(name) && ['kcal/kg', 'kcal/100g'].includes(unit)) {
      key = 'kcal';
      value = unit === 'kcal/kg' ? component.value / 10 : component.value;
      if (value > 1000) continue;
    } else continue;
    const observations = values.get(key) ?? new Set<number>();
    observations.add(value);
    values.set(key, observations);
  }
  const profile: Partial<Record<Nutrient, number>> = {};
  for (const [key, observations] of values) {
    if (key !== 'kcal' && observations.size === 1) profile[key] = [...observations][0];
  }
  const calories = values.get('kcal');
  return { profile, kcalPer100g: calories?.size === 1 ? [...calories][0] : null, source: 'confirmed_package_label' as const };
}
