import { describe, expect, it } from 'vitest';
import {
  countFirstTokens,
  extractBrandCandidate,
  extractBrandCandidates,
  firstTokenOf,
  MIN_BRAND_OCCURRENCES,
  resolveCanonicalBrand,
} from './brandExtraction';

/** 운영 DB 실제 제품명에서 가져온 표본. */
const REAL_NAMES = [
  '탐사 클래식 진도 사료',
  '탐사 오리고기 강아지 사료, 2kg, 1개',
  '로얄캐닌 헤어볼 케어 고양이 사료',
  '로얄 수피아캔, 음수량충족 고양이캔, 85g, 30개',
  '[국내산 오리] 바삭하고 단백한 영양식 유황 품은 오리안심육포, 5개, 70g',
  '광동 견옥츄 덴탈껌 12g x 15개입',
];

describe('브랜드 추출', () => {
  it('제품명 첫 단어를 브랜드 후보로 본다', () => {
    expect(firstTokenOf('탐사 클래식 진도 사료')).toBe('탐사');
    expect(firstTokenOf('now 어덜트 강아지 사료')).toBe('now');
  });

  it('앞에 붙은 대괄호 태그는 브랜드가 아니다', () => {
    // "[국내산 오리]" 는 원산지 표시이지 브랜드가 아니다.
    expect(firstTokenOf('[국내산 오리] 바삭하고 단백한 영양식')).toBe('바삭하고');
  });

  it('법인 형태 표기를 떼어낸다', () => {
    expect(firstTokenOf('주식회사 제주펫 강아지 간식')).toBe('제주펫');
    expect(firstTokenOf('(주)하림펫푸드 더리얼')).toBe('하림펫푸드');
  });

  it('숫자로 시작하면 브랜드로 보지 않는다', () => {
    expect(firstTokenOf('2kg 대용량 사료')).toBe('');
  });

  it('여러 제품에서 반복되는 첫 단어만 브랜드로 인정한다', () => {
    const counts = countFirstTokens(REAL_NAMES);
    expect(counts.get('탐사')).toBe(2);

    const repeated = extractBrandCandidate('탐사 클래식 진도 사료', counts);
    expect(repeated.brand).toBe('탐사');
    expect(repeated.occurrences).toBe(2);
  });

  it('한 번만 나오는 단어는 브랜드로 지어내지 않는다', () => {
    // 근거가 없으면 비워 두고 검토 사유를 남긴다.
    const counts = countFirstTokens(REAL_NAMES);
    const once = extractBrandCandidate('광동 견옥츄 덴탈껌 12g x 15개입', counts);
    expect(once.occurrences).toBeLessThan(MIN_BRAND_OCCURRENCES);
    expect(once.brand).toBe('');
    expect(once.needsReview).toContain('광동');
  });

  it("'로얄' 과 '로얄캐닌' 은 서로 다른 브랜드라 합치지 않는다", () => {
    // 운영자 확인을 거친 예외다. "로얄 수피아캔" 과 "로얄캐닌 헤어볼" 은 실제로 다른 브랜드다.
    const names = [...REAL_NAMES, '로얄캐닌 인도어 고양이 사료', '로얄 수피아 캔 2'];
    const counts = countFirstTokens(names);

    const canin = extractBrandCandidate('로얄캐닌 헤어볼 케어 고양이 사료', counts);
    expect(canin.brand).toBe('로얄캐닌');
    expect(canin.needsReview).toContain('분리');

    const royal = extractBrandCandidate('로얄 수피아캔, 음수량충족 고양이캔, 85g, 30개', counts);
    expect(royal.brand).toBe('로얄');
  });

  it('앞부분이 겹치는 나머지 후보는 짧은 쪽 브랜드로 합친다', () => {
    // 긴 쪽은 브랜드에 제품라인이 붙은 것이다: 하림펫푸드밥이보약 → 하림펫푸드.
    const names = [
      '하림펫푸드 더리얼 그레인프리 사료',
      '하림펫푸드 어덜트 크런치 건식사료',
      '하림펫푸드밥이보약 강아지 기능성 사료',
      '하림펫푸드더리얼 강아지 동결건조 트릿',
    ];
    const counts = countFirstTokens(names);
    expect(resolveCanonicalBrand('하림펫푸드밥이보약', counts)).toBe('하림펫푸드');

    const c = extractBrandCandidate('하림펫푸드밥이보약 강아지 기능성 사료', counts);
    expect(c.brand).toBe('하림펫푸드');
    expect(c.needsReview).toContain('합침');
  });

  it('한 번만 나오는 단어라도 인정된 브랜드에 흡수되면 그 브랜드로 본다', () => {
    // '탐사6free강아지' 는 1건뿐이지만 '탐사' 의 제품라인이다.
    const names = [...REAL_NAMES, '탐사6free강아지 사료 치킨 레시피'];
    const counts = countFirstTokens(names);
    const c = extractBrandCandidate('탐사6free강아지 사료 치킨 레시피', counts);
    expect(c.occurrences).toBe(1);
    expect(c.brand).toBe('탐사');
  });

  it('일반명사로 시작하는 제품은 브랜드를 지어내지 않는다', () => {
    // '강아지' 가 여러 번 반복돼도 브랜드가 아니다. 넣으면 없느니만 못하다.
    const names = [
      '강아지 오랄클리닉 덴탈껌 세트',
      '강아지 수제간식 국내산100% 닭가슴살 육포',
      '강아지간식 황태 수제간식 무첨가 트릿',
    ];
    const counts = countFirstTokens(names);
    const c = extractBrandCandidate('강아지 오랄클리닉 덴탈껌 세트', counts);
    expect(c.brand).toBe('');
    expect(c.needsReview).toContain('일반명사');
  });

  it('일반명사로 시작해도 그 뒤가 붙어 브랜드가 되면 그 브랜드로 본다', () => {
    // "프로바이오틱 라이브" 와 "프로바이오틱라이브" 는 띄어쓰기만 다른 같은 브랜드다.
    const names = [
      '프로바이오틱라이브 어덜트 캣 중성화 건식사료',
      '프로바이오틱라이브 어덜트용 고양이 건식사료',
      '프로바이오틱 라이브 소형성견용 강아지 건식사료, 연어, 2kg, 1개',
    ];
    const counts = countFirstTokens(names);
    const c = extractBrandCandidate('프로바이오틱 라이브 소형성견용 강아지 건식사료, 연어, 2kg, 1개', counts);
    expect(c.brand).toBe('프로바이오틱라이브');
    // 띄어 쓴 브랜드는 두 단어를 모두 떼어낸다.
    expect(c.displayName).not.toContain('라이브');
    expect(c.displayName).toContain('소형성견용');
  });

  it('브랜드를 뗀 제품명을 따로 돌려준다', () => {
    const counts = countFirstTokens(REAL_NAMES);
    const c = extractBrandCandidate('탐사 오리고기 강아지 사료, 2kg, 1개', counts);
    expect(c.brand).toBe('탐사');
    // 브랜드는 별도 칸에 두므로 제품명 앞에서 뗀다.
    expect(c.displayName).not.toContain('탐사');
    expect(c.displayName).toContain('오리고기');
    // 용량(2kg)은 남긴다 — 같은 제품의 다른 용량을 구분하는 정보라서
    // productDisplay 가 의도적으로 보존한다. 수량('1개')은 정제된다.
    expect(c.displayName).toContain('2kg');
    expect(c.displayName).not.toContain('1개');
  });

  it('목록 전체를 한 번에 처리한다', () => {
    const all = extractBrandCandidates(REAL_NAMES);
    expect(all).toHaveLength(REAL_NAMES.length);
    expect(all.filter((c) => c.brand).length).toBeGreaterThan(0);
  });
});
