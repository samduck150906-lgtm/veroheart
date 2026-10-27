import type { Product, UserPetProfile } from '../types';
import { isRealPetProfile, resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { searchProductsPage } from './supabase';

export const HOME_RECOMMENDATION_MIN_SCORE = 90;
const HOME_RECOMMENDATION_LIMIT = 3;

export function selectHomeRecommendations(products: Product[], profile: UserPetProfile) {
  if (!isRealPetProfile(profile)) return [];
  const species = profile.species === 'Cat' ? 'cat' : 'dog';
  return [...new Map(products.map((product) => [product.id, product])).values()]
    .filter((product) => !product.requiresVeterinaryGuidance &&
      (product.targetPetType === species || product.targetPetType === 'all'))
    .map((product) => ({ product, verdict: resolveProductDisplayVerdict(product, profile) }))
    .filter(({ verdict }) => verdict.canShowScore && verdict.score >= HOME_RECOMMENDATION_MIN_SCORE)
    .sort((a, b) => b.verdict.score - a.verdict.score || a.product.id.localeCompare(b.product.id))
    .slice(0, HOME_RECOMMENDATION_LIMIT);
}

export type HomeRecommendation = ReturnType<typeof selectHomeRecommendations>[number];

/**
 * The startup catalog has no ingredients. Read full public search pages instead;
 * stop once three eligible products are found, never pad with lower scores.
 * These are qualifying suggestions, not a claim to the top three of the catalog.
 */
export async function loadHomeRecommendations(
  profile: UserPetProfile,
  isCancelled: () => boolean = () => false,
): Promise<HomeRecommendation[]> {
  if (!isRealPetProfile(profile)) return [];
  let offset = 0;
  let recommendations: HomeRecommendation[] = [];
  while (!isCancelled()) {
    const page = await searchProductsPage('', undefined, [], {
      targetPetType: profile.species === 'Cat' ? 'cat' : 'dog',
    }, offset);
    if (isCancelled()) return [];
    recommendations = selectHomeRecommendations([
      ...recommendations.map(({ product }) => product), ...page.products,
    ], profile);
    if (recommendations.length >= HOME_RECOMMENDATION_LIMIT || page.nextOffset === null) {
      return recommendations;
    }
    if (!Number.isFinite(page.nextOffset) || page.nextOffset <= offset) {
      throw new Error('추천 제품을 불러오지 못했습니다.');
    }
    offset = page.nextOffset;
  }
  return [];
}
