import { describe, expect, it } from 'vitest';
import { normalizeProductDisplayName, truncateName } from './productDisplay';

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
    expect(out).toContain('2kg');
    // 선행 브랜드 중복 제거
    expect(out.startsWith('브랜드')).toBe(false);
  });

  it('광고성 괄호 블록을 제거한다', () => {
    const out = normalizeProductDisplayName({ name: '고양이 사료 참치 [무료배송] (오늘출발) 3kg' });
    expect(out).not.toMatch(/무료배송|오늘출발|[[\]()]/);
    expect(out).toContain('참치');
    expect(out).toContain('3kg');
  });

  it('displayName 이 있으면 그대로 최우선 사용한다', () => {
    expect(normalizeProductDisplayName({ displayName: '로얄캐닌 미니 어덜트', name: '아무거나 로켓배송' }))
      .toBe('로얄캐닌 미니 어덜트');
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
