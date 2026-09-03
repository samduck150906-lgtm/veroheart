import { describe, expect, it } from 'vitest';
import { planChanges } from './brandApplyPlan';

describe('브랜드 반영 계획', () => {
  it('수집 출처가 들어간 자리만 덮어쓴다', () => {
    const { changes } = planChanges([
      { id: '1', name: '탐사 클래식 진도 사료', brand_name: '쿠팡검색' },
      { id: '2', name: '탐사 퍼피 도그푸드', brand_name: '쿠팡상품' },
    ]);
    expect(changes.map((c) => c.after)).toEqual(['탐사', '탐사']);
  });

  it('이미 진짜 브랜드가 들어 있으면 건드리지 않는다', () => {
    const { changes, skipped } = planChanges([
      { id: '1', name: '탐사 클래식 진도 사료', brand_name: '탐사' },
      { id: '2', name: '탐사 퍼피 도그푸드', brand_name: '어떤브랜드' },
    ]);
    expect(changes).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it('브랜드를 못 뽑은 제품은 빈 값으로 덮어쓰지 않는다', () => {
    // 한 번만 나오는 첫 단어는 브랜드라는 근거가 없다.
    const { changes, skipped } = planChanges([
      { id: '1', name: '광동 견옥츄 덴탈껌 12g x 15개입', brand_name: '쿠팡검색' },
    ]);
    expect(changes).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('일반명사로 시작하는 제품에 가짜 브랜드를 넣지 않는다', () => {
    const { changes } = planChanges([
      { id: '1', name: '강아지 오랄클리닉 덴탈껌 세트', brand_name: '쿠팡검색' },
      { id: '2', name: '강아지 수제간식 국내산100% 닭가슴살 육포', brand_name: '쿠팡검색' },
      { id: '3', name: '강아지간식 황태 수제간식 무첨가 트릿', brand_name: '쿠팡검색' },
    ]);
    expect(changes).toHaveLength(0);
  });

  it("'로얄' 과 '로얄캐닌' 을 각각 그대로 반영한다", () => {
    const { changes } = planChanges([
      { id: '1', name: '로얄 수피아캔, 고양이캔', brand_name: '쿠팡검색' },
      { id: '2', name: '로얄 미쵸캔, 고양이캔', brand_name: '쿠팡검색' },
      { id: '3', name: '로얄캐닌 인도어 고양이 사료', brand_name: '쿠팡검색' },
      { id: '4', name: '로얄캐닌 헤어볼 케어 고양이 사료', brand_name: '쿠팡검색' },
    ]);
    expect(changes.map((c) => c.after)).toEqual(['로얄', '로얄', '로얄캐닌', '로얄캐닌']);
  });
});
