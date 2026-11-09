import { describe, expect, it } from 'vitest';
import { getProductDisplayParts, normalizeProductDisplayName, truncateName, resolveBrandLabel } from './productDisplay';

describe('normalizeProductDisplayName', () => {
  it('쿠팡 원문의 배송·수량·홍보 문구를 제거하되 제품 구분 정보는 보존한다', () => {
    const out = normalizeProductDisplayName({
      brand: '브랜드',
      name: '브랜드 공식 강아지 사료 연어 피부건강 전연령 2kg 1개 로켓배송',
    });
    // 광고/배송/수량/선행 브랜드 제거
    expect(out).not.toMatch(/공식|로켓배송|1개/);
    // 제품 구분 정보 보존
    expect(out).toContain('연어');
    expect(out).toContain('피부건강');
    expect(out).toContain('전연령');
    expect(out).not.toContain('2kg');
    // 선행 브랜드 중복 제거
    expect(out.startsWith('브랜드')).toBe(false);
  });

  it('광고성 괄호 블록을 제거한다', () => {
    const out = normalizeProductDisplayName({ name: '고양이 사료 참치 [무료배송] (오늘출발) 3kg' });
    expect(out).not.toMatch(/무료배송|오늘출발|[[\]()]/);
    expect(out).toContain('참치');
    expect(out).not.toContain('3kg');
  });

  it('displayName 이 있으면 그대로 최우선 사용한다', () => {
    expect(normalizeProductDisplayName({ displayName: '로얄캐닌 미니 어덜트', name: '아무거나 로켓배송' }))
      .toBe('로얄캐닌 미니 어덜트');
  });

  it('수입된 표시명에도 배송·환불 홍보가 남지 않는다', () => {
    expect(normalizeProductDisplayName({ displayName: ')당일발송( 로얄캐닌 하이포알러제닉 스몰독 1kg' }))
      .toBe('로얄캐닌 하이포알러제닉 스몰독');
    expect(normalizeProductDisplayName({ displayName: '올바른끼니 알파 양고기 (안먹으면 100% 환불 보장) 1.2kg' }))
      .toBe('올바른끼니 알파 양고기');
  });

  it('과도하게 제거되어 비면 원본으로 안전 폴백한다', () => {
    // 전부 프로모션 토큰이면 원본 유지
    expect(normalizeProductDisplayName({ name: '무료배송 로켓배송' })).toBe('무료배송 로켓배송');
  });

  it('빈 입력은 빈 문자열', () => {
    expect(normalizeProductDisplayName({ name: '' })).toBe('');
    expect(normalizeProductDisplayName({})).toBe('');
  });

  it('truncateName 은 길면 말줄임', () => {
    expect(truncateName('짧은 이름', 20)).toBe('짧은 이름');
    expect(truncateName('a'.repeat(80), 10)).toHaveLength(10);
    expect(truncateName('a'.repeat(80), 10).endsWith('…')).toBe(true);
  });
});

describe('getProductDisplayParts', () => {
  it('moves marketplace package weight/count out of the name while preserving formula identifiers', () => {
    const display = getProductDisplayParts({ brand: '펫라벨', name: '그릭 요거트 30 개입 (12 g x 30ea)' });
    expect(display.name).toBe('그릭 요거트');
    expect(display.meta).toContain('12g');
    expect(display.meta).toContain('30개입');
    expect(getProductDisplayParts({ name: '제품 2kg 1개', displayName: '제조사 제품명' }).meta).toContain('2kg');
    expect(normalizeProductDisplayName({ name: '다이제스티브 200 연어 30% 비타민 500mg 14gX30개' }))
      .toBe('다이제스티브 200 연어 30% 비타민 500mg');
  });
  it('정제 이름을 우선하고 변형·중량만 한 줄 메타로 합친다', () => {
    expect(getProductDisplayParts({
      brand: '오리젠',
      name: '쿠팡 원문',
      displayName: '오리지널 독',
      variantName: '닭고기 · 성견',
      netWeightText: '2kg',
      catalogSource: 'community_scan',
    })).toEqual({
      brand: '오리젠',
      name: '오리지널 독',
      meta: '닭고기 · 성견 · 2kg',
    });
  });

  it('수집 출처 브랜드와 빈 메타는 공개 표시에서 숨긴다', () => {
    expect(getProductDisplayParts({
      brand: '쿠팡검색',
      name: '실제 제품명',
      variantName: ' ',
      netWeightText: '',
    })).toEqual({ brand: '', name: '실제 제품명', meta: '' });
  });
});

it.each(['강아지', '고양이', 'NEW', '영국1위'])('hides a generic source label instead of presenting it as brand: %s', brand => {
 expect(resolveBrandLabel({name: '연어 간식', brand})).toBe('');
});
