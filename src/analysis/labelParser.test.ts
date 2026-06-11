import { describe, expect, it } from 'vitest';
import {
  extractSection,
  splitIngredients,
  parseIngredientToken,
  parseGuaranteedAnalysis,
  parseLabel,
} from './labelParser';

const SAMPLE = `원료명: 닭고기, 고구마, 완두단백, 닭지방, 글리세린, 연어오일, 혼합토코페롤
등록성분량: 조단백질 25% 이상, 조지방 12% 이상, 조섬유 4% 이하, 조회분 8% 이하, 수분 10% 이하
급여량: 체중에 따라 급여하세요.`;

describe('extractSection', () => {
  it('원료명 구간만 잘라낸다', () => {
    const sec = extractSection(SAMPLE, ['원료명'], ['등록성분량']);
    expect(sec).toContain('닭고기');
    expect(sec).not.toContain('조단백질');
  });
});

describe('splitIngredients', () => {
  it('괄호 안 쉼표는 분할하지 않는다', () => {
    const toks = splitIngredients('닭고기(닭, 닭간), 쌀, 연어오일');
    expect(toks).toEqual(['닭고기(닭, 닭간)', '쌀', '연어오일']);
  });

  it('다양한 구분자(·, /, 줄바꿈)를 처리한다', () => {
    const toks = splitIngredients('닭고기·쌀/현미\n연어');
    expect(toks).toEqual(['닭고기', '쌀', '현미', '연어']);
  });
});

describe('parseIngredientToken', () => {
  it('함량%와 기준을 분리한다', () => {
    expect(parseIngredientToken('닭고기(배합기준 30%)')).toEqual({
      originalName: '닭고기',
      percent: 30,
      percentBasis: '배합기준',
    });
  });

  it('퍼센트가 없으면 null', () => {
    expect(parseIngredientToken('현미')).toEqual({
      originalName: '현미',
      percent: null,
      percentBasis: null,
    });
  });

  it('기준 표기 없는 퍼센트는 unknown 기준', () => {
    const r = parseIngredientToken('닭고기 26%');
    expect(r.originalName).toBe('닭고기');
    expect(r.percent).toBe(26);
    expect(r.percentBasis).toBe('unknown');
  });
});

describe('parseGuaranteedAnalysis', () => {
  it('등록성분량 수치를 파싱한다', () => {
    const ga = parseGuaranteedAnalysis(SAMPLE);
    expect(ga.crudeProtein).toBe(25);
    expect(ga.crudeFat).toBe(12);
    expect(ga.crudeFiber).toBe(4);
    expect(ga.crudeAsh).toBe(8);
    expect(ga.moisture).toBe(10);
  });
});

describe('parseLabel (통합)', () => {
  it('원료를 순위와 함께 사전에 매칭한다', () => {
    const parsed = parseLabel(SAMPLE);
    expect(parsed.ingredients[0].originalName).toBe('닭고기');
    expect(parsed.ingredients[0].position).toBe(1);
    expect(parsed.ingredients[0].ingredient?.id).toBe('chicken');
    expect(parsed.ingredients.find((i) => i.originalName === '연어오일')?.ingredient?.id).toBe(
      'salmon_oil',
    );
    expect(parsed.guaranteedAnalysis.crudeProtein).toBe(25);
  });

  it('원료명 헤더 없는 콤마 목록도 폴백 처리한다', () => {
    const parsed = parseLabel('닭고기, 쌀, 자일리톨');
    expect(parsed.ingredients).toHaveLength(3);
    expect(parsed.ingredients[2].ingredient?.id).toBe('xylitol');
  });
});
