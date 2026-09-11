import type { Product } from '../types';

export const HEALTH_FILTER_MIN_PRODUCTS = 10;
export const HEALTH_FILTER_MIN_COVERAGE = 0.7;

/** 빈 DB 필터를 사용자에게 제공하지 않기 위한 운영 데이터 coverage gate. */
export function isHealthFilterAvailable(products: Product[]): boolean {
  if (products.length < HEALTH_FILTER_MIN_PRODUCTS) return false;
  const tagged = products.filter((product) => (product.healthConcerns?.length ?? 0) > 0).length;
  return tagged / products.length >= HEALTH_FILTER_MIN_COVERAGE;
}
