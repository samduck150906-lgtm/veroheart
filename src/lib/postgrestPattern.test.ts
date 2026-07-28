import { describe, expect, it } from 'vitest';
import { toExactIlikePattern, toOrIlikePattern } from './postgrestPattern';

describe('toOrIlikePattern', () => {
  it('값을 큰따옴표로 감싼 부분일치 패턴을 만든다', () => {
    expect(toOrIlikePattern('연어')).toBe('"%연어%"');
  });

  it('쉼표·괄호가 있어도 값이 그대로 인용된다(or 파서 안전)', () => {
    expect(toOrIlikePattern('구토, 설사')).toBe('"%구토, 설사%"');
    expect(toOrIlikePattern('닭(가슴살)')).toBe('"%닭(가슴살)%"');
  });

  it('큰따옴표와 역슬래시는 이스케이프한다', () => {
    expect(toOrIlikePattern('a"b')).toBe('"%a\\"b%"');
    expect(toOrIlikePattern('a\\b')).toBe('"%a\\\\b%"');
  });
});

describe('toExactIlikePattern', () => {
  it('와일드카드를 이스케이프해 리터럴 비교 패턴을 만든다', () => {
    expect(toExactIlikePattern('50% 연어')).toBe('50\\% 연어');
    expect(toExactIlikePattern('a_b')).toBe('a\\_b');
    expect(toExactIlikePattern('a\\b')).toBe('a\\\\b');
  });

  it('일반 문자열은 그대로 반환한다', () => {
    expect(toExactIlikePattern('Churu')).toBe('Churu');
  });
});
