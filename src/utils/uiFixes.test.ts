import { describe, it, expect } from 'vitest';
import type { Product } from '../types';
import { matchesSpecies, matchesCategory } from './rankingFilters';
import { displayBrand, hasMeaningfulBrand } from './brandLabel';

const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: 'p1', brand: '테스트', name: '테스트 사료', category: 'food',
  imageUrl: '', ingredients: [], reviewsCount: 0, averageRating: 0, ...over,
});

// ── P0-2: 랭킹 종/카테고리 필터 (한글 라벨 ↔ 영문 enum) ───────────────
describe('ranking filters (P0-2)', () => {
  it('matches species across Korean label / English target_pet_type', () => {
    const dog = makeProduct({ targetPetType: 'dog' });
    // 버그 재현 방지: '강아지' 라벨이 'dog' 상품과 매칭되어야 함
    expect(matchesSpecies(dog, '강아지')).toBe(true);
    expect(matchesSpecies(dog, '고양이')).toBe(false);
    expect(matchesSpecies(dog, '전체')).toBe(true);

    const all = makeProduct({ targetPetType: 'all' });
    expect(matchesSpecies(all, '강아지')).toBe(true);
    expect(matchesSpecies(all, '고양이')).toBe(true);

    // target_pet_type 미지정 상품은 모든 종 필터를 통과(빈 랭킹 방지)
    const none = makeProduct({ targetPetType: undefined });
    expect(matchesSpecies(none, '강아지')).toBe(true);
    expect(matchesSpecies(none, '고양이')).toBe(true);
  });

  it('matches category against main_category, not product_type', () => {
    const p = makeProduct({ category: 'food', mainCategory: '사료' });
    // 버그 재현 방지: category='food'를 '사료'와 비교하면 실패했음 → mainCategory로 매칭
    expect(matchesCategory(p, '사료')).toBe(true);
    expect(matchesCategory(p, '간식')).toBe(false);
    expect(matchesCategory(p, '전체')).toBe(true);
  });
});

// ── P1-4: "쿠팡상품" 등 내부 플레이스홀더 브랜드 정리 ──────────────────
describe('brand label sanitizing (P1-4)', () => {
  it('replaces placeholder brands with a guess from the product name', () => {
    expect(displayBrand('쿠팡상품', 'now 어덜트 강아지 그레인프리 사료')).toBe('now');
    expect(displayBrand('쿠팡 파트너스', '오가앤리프 유기농 강아지 사료')).toBe('오가앤리프');
    expect(displayBrand('쿠팡상품', '')).toBe('');
  });

  it('keeps real brand names untouched', () => {
    expect(displayBrand('로얄캐닌', '미니 어덜트')).toBe('로얄캐닌');
    expect(hasMeaningfulBrand('로얄캐닌')).toBe(true);
    expect(hasMeaningfulBrand('쿠팡상품')).toBe(false);
    expect(hasMeaningfulBrand('')).toBe(false);
  });
});
