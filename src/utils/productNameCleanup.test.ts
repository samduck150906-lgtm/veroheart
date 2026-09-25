import { describe, expect, it } from 'vitest';
import {
  buildProductCleanupSuggestions,
  normalizeCleanupIdentity,
  suggestProductNameCleanup,
} from './productNameCleanup';

describe('제품명·브랜드 정리 제안', () => {
  it('배송·할인·광고성 괄호와 안전한 홍보 꼬리만 제거한다', () => {
    const result = suggestProductNameCleanup({
      name: '[로켓배송] 오리젠 오리지널 캣 정품 특가 | 무료배송 쿠폰 이벤트',
      brandName: '오리젠',
    });
    expect(result.name).toBe('오리젠 오리지널 캣');
    expect(result.nameNeedsReview).toBe(false);
  });

  it('주원료·생애주기·기능·맛·제형·라인명은 보존한다', () => {
    const result = suggestProductNameCleanup({
      name: '보노네이처 시그니처 닭 연어 전연령 피부 요로 기능성 소프트 꿀고구마맛',
      brandName: '보노네이처',
    });
    for (const token of ['시그니처', '닭', '연어', '전연령', '피부', '요로', '소프트', '꿀고구마맛']) {
      expect(result.name).toContain(token);
    }
  });

  it('광고 단어와 식별 정보가 섞인 괄호를 통째로 제거하지 않는다', () => {
    for (const identifier of ['닭고기', '연어맛', '전연령', '피부관리']) {
      const original = `로얄캐닌 사료 [정품 ${identifier}]`;
      const result = suggestProductNameCleanup({ name: original, brandName: '로얄캐닌' });
      expect(result.name, identifier).toContain(identifier);
      expect(result.name, identifier).toBe(original);
    }
  });

  it('구분자와 쉼표 뒤의 광고·식별 혼합 문구도 제거하지 않는다', () => {
    for (const [original, identifier] of [
      ['로얄캐닌 사료 | 정품 닭고기', '닭고기'],
      ['로얄캐닌 사료, 특가 연어맛', '연어맛'],
    ]) {
      const result = suggestProductNameCleanup({ name: original, brandName: '로얄캐닌' });
      expect(result.name).toContain(identifier);
    }
  });

  it('중량·포장 수량이 있는 판매 옵션은 삭제하지 않고 확인 필요로 둔다', () => {
    const original = '굿포펫 엔자이츄 꿀고구마맛, 1개, 100g, 3팩';
    const result = suggestProductNameCleanup({ name: original, brandName: '굿포펫' });
    expect(result.name).toBe(original);
    expect(result.nameNeedsReview).toBe(true);
    expect(result.risks.join(' ')).toContain('SKU');
  });

  it('한글 포장 단위도 단어 경계와 무관하게 SKU 위험으로 감지한다', () => {
    for (const unit of ['3개', '2개입', '4팩', '5봉', '1세트']) {
      const original = `테스트 연어 사료, ${unit}`;
      const result = suggestProductNameCleanup({ name: original, brandName: '테스트' });
      expect(result.name, unit).toBe(original);
      expect(result.nameNeedsReview, unit).toBe(true);
    }
  });

  it('공백 없는 구분자 뒤 명백한 홍보 문구도 보수적으로 제거한다', () => {
    expect(suggestProductNameCleanup({
      name: '오리젠 오리지널 캣|무료배송 쿠폰',
      brandName: '오리젠',
    }).name).toBe('오리젠 오리지널 캣');
  });

  it('구분자 뒤 단백질원·기능 문구를 광고로 오인해 자르지 않는다', () => {
    const original = '버기빅스 저알러지 간식 | 곤충단백질, 눈물자국 관리';
    const result = suggestProductNameCleanup({ name: original, brandName: '버기빅스' });
    expect(result.name).toBe(original);
    expect(result.needsReview).toBe(true);
  });

  it('지나치게 짧아지는 결과는 원본을 유지한다', () => {
    const original = '[무료배송] 캣 특가';
    const result = suggestProductNameCleanup({ name: original, brandName: '쿠팡검색' });
    expect(result.name).toBe(original);
    expect(result.nameNeedsReview).toBe(true);
  });

  it('수집 출처 브랜드는 실제 브랜드로 인정하지 않고 첫 단어도 사람 확인 대상으로 둔다', () => {
    const result = suggestProductNameCleanup({
      name: '펫트리언츠 루트릿덕 오리 동결건조 간식',
      brandName: '쿠팡상품',
    });
    expect(result.brandName).toBe('펫트리언츠');
    expect(result.brandNeedsReview).toBe(true);
    expect(result.needsReview).toBe(true);
  });

  it('확정할 브랜드 후보가 없으면 수집 출처 값을 유지하고 확인 필요로 둔다', () => {
    const result = suggestProductNameCleanup({ name: '1+1', brandName: '쿠팡검색' });
    expect(result.brandName).toBe('쿠팡검색');
    expect(result.brandNeedsReview).toBe(true);
  });

  it('한글·영문·숫자·괄호·쉼표 조합을 결정적으로 처리한다', () => {
    const input = { name: 'ACANA(아카나) Puppy Recipe 2kg, 정품', brandName: 'ACANA' };
    const first = suggestProductNameCleanup(input);
    expect(first).toEqual(suggestProductNameCleanup(input));
    expect(first.name).toContain('Puppy Recipe 2kg');
  });

  it('빈 값과 비정상 입력을 안전하게 처리한다', () => {
    const result = suggestProductNameCleanup({ name: null as unknown as string, brandName: undefined as unknown as string });
    expect(result.name).toBe('');
    expect(result.changed).toBe(false);
    expect(result.needsReview).toBe(true);
  });

  it('공백·기호·대소문자 차이를 동일한 정리 키로 본다', () => {
    expect(normalizeCleanupIdentity('ACANA Puppy-Food')).toBe(normalizeCleanupIdentity('acana puppy food'));
  });

  it('정리 후 동일 제품명·브랜드가 되는 후보를 자동 적용에서 제외한다', () => {
    const suggestions = buildProductCleanupSuggestions([
      { id: 'a', name: '[특가] 오리젠 오리지널 캣', brandName: '오리젠' },
      { id: 'b', name: '오리젠 오리지널 캣', brandName: '오리젠' },
    ]);
    const result = suggestions.get('a');
    expect(result?.needsReview).toBe(true);
    expect(result?.risks.join(' ')).toContain('제품명·브랜드가 같아짐');
  });

  it('중량만 다른 같은 브랜드 제품을 SKU 위험으로 표시한다', () => {
    const suggestions = buildProductCleanupSuggestions([
      { id: 'a', name: '오리젠 오리지널 캣 1kg', brandName: '오리젠' },
      { id: 'b', name: '오리젠 오리지널 캣 5kg', brandName: '오리젠' },
    ]);
    expect(suggestions.get('a')?.risks.join(' ')).toContain('중량·포장 정보만 다를 수 있음');
    expect(suggestions.get('b')?.needsReview).toBe(true);
  });
});
