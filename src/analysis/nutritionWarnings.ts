import type { Product, UserPetProfile } from '../types';
import { analyzeFeed } from './feedAnalysis';

/** Reuse assessed warnings; missing measurements never create a deficiency. */
export function getAssessedNutritionWarnings(product: Product, profile: UserPetProfile): string[] {
  const feed = analyzeFeed(product, profile);
  return [
    product.requiresVeterinaryGuidance
      ? '수의사 상담이 필요한 제품입니다. 처방과 급여량은 담당 수의사의 안내를 따라 주세요.' : null,
    ...(feed.aafco.evaluated && !feed.aafco.passed ? feed.aafco.details : []),
    feed.caP.note,
  ].filter((text): text is string => Boolean(text));
}
