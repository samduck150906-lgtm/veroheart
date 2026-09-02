import { describe, expect, it } from 'vitest';
import { INGREDIENT_DICTIONARY } from './ingredientDictionary';
import {
  allergyCautionMatches,
  allergyTagsForIngredient,
  classifyAllergyRelationship,
  isFamilyAllergyIngredient,
} from './allergyFamilyMatcher';
import type { Ingredient } from '../types';

/**
 * 홈·검색·비교 화면은 프로필 기준 점수를 매기려고 전체 제품을 한 번에 훑는다.
 * 그 경로가 원료 하나를 볼 때마다 성분 사전(항목 111개 × 표기 약 1,300개)을 다시
 * 정규화하며 훑으면, 알레르기를 등록한 사용자에게만 메인 스레드가 수십 초 멈춰
 * 브라우저가 '응답 없는 페이지'로 판정한다(운영 데이터 기준 458개 × 알레르기 3개 ≈ 136초).
 *
 * 사전 색인과 정규화 캐시가 빠지면 이 테스트가 먼저 깨지도록 실제 운영 규모로 측정한다.
 */
const PRODUCT_COUNT = 458;
const INGREDIENTS_PER_PRODUCT = 10;
const ALLERGIES = ['닭고기', '소고기', '연어'];

/** 사전 표기를 돌려써서 매칭이 실제로 일어나는 원료 목록을 만든다. */
function buildIngredients(count: number): Ingredient[] {
  const labels = INGREDIENT_DICTIONARY.flatMap((entry) => [entry.canonicalKo, ...entry.aliases]);
  return Array.from({ length: count }, (_, i) => ({
    id: `ing-${i}`,
    nameKo: labels[i % labels.length],
    nameEn: INGREDIENT_DICTIONARY[i % INGREDIENT_DICTIONARY.length].canonicalEn ?? '',
    riskLevel: 'safe',
    purpose: '',
    description: '',
  } as Ingredient));
}

describe('allergyFamilyMatcher 성능 회귀 가드', () => {
  it('운영 규모(제품 458개 × 알레르기 3개)를 화면 한 프레임 예산 안에서 훑는다', () => {
    // 제품마다 사전의 다른 구간을 보게 해서 캐시가 한 원료만 채우고 끝나지 않게 한다.
    // 측정 대상은 매처뿐이므로 입력 생성은 계측 밖에서 끝낸다.
    const pool = buildIngredients(PRODUCT_COUNT * INGREDIENTS_PER_PRODUCT);
    const products = Array.from({ length: PRODUCT_COUNT }, (_, p) =>
      Array.from({ length: INGREDIENTS_PER_PRODUCT }, (_, i) => ({
        ...pool[p * INGREDIENTS_PER_PRODUCT + i],
        id: `p${p}-i${i}`,
      })),
    );

    const started = performance.now();
    let hits = 0;
    for (const ingredients of products) {
      for (const ingredient of ingredients) {
        if (isFamilyAllergyIngredient(ingredient, ALLERGIES)) hits += 1;
      }
      hits += allergyCautionMatches(ingredients, ALLERGIES).length;
    }
    const elapsed = performance.now() - started;

    // 매칭이 실제로 일어났는지 먼저 확인한다 — 0건이면 시간만 빠른 무의미한 통과다.
    expect(hits).toBeGreaterThan(0);
    // 수정 전 같은 규모가 약 136,000ms 였다. 느린 CI 를 감안해도 1초면 충분히 넉넉하다.
    expect(elapsed).toBeLessThan(1000);
  });

  it('같은 라벨을 반복 조회해도 첫 조회 대비 비용이 늘지 않는다', () => {
    const ingredient = buildIngredients(1)[0];

    const first = performance.now();
    classifyAllergyRelationship(ingredient, '닭고기');
    allergyTagsForIngredient(ingredient);
    const firstCost = performance.now() - first;

    const repeat = performance.now();
    for (let i = 0; i < 5000; i += 1) {
      classifyAllergyRelationship(ingredient, '닭고기');
      allergyTagsForIngredient(ingredient);
    }
    const repeatCost = performance.now() - repeat;

    // 5,000회 반복이 첫 1회의 5,000배 근처로 돌아가면 캐시가 사라진 것이다.
    expect(repeatCost).toBeLessThan(Math.max(50, firstCost * 500));
  });
});
