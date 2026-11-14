import { describe, expect, it } from 'vitest';
import { estimateMaterialContribution, estimateReferenceContribution, materialNutrientRoles, type MaterialConstituent, type MaterialNutrientReference } from './materialComposition';
import { matchCanonicalIngredients } from './canonicalIngredientMatcher';
import { parseIngredientLabelItems } from './labelIngredientParser';

const rice: MaterialConstituent = { constituentCode: 'starch', constituentName: '전분', nutrientCode: 'carbohydrate', nutrientName: '탄수화물', relation: 'source_of', sourceUrl: 'https://example.org/rice', sourceVersion: 'fixture', amount: null, unit: null, basis: null };
describe('원재료 → 구성 성분 → 영양소', () => {
  it('단위·기준·원본 품질이 다른 원료 참고값을 제품 영양값으로 쓰지 않는다',()=>{
    const reference:MaterialNutrientReference={nutrientCode:'protein',name:'조단백질',value:10,unit:'g/100g',basis:'as_fed',sourceUrl:'https://example.org',sourceVersion:'fixture',sourceSha256:'a'.repeat(64),sourceLocator:'fixture',quality:'reference',qualityNote:'fixture'};
    expect(estimateReferenceContribution(20,reference)?.gramsPer100g).toBe(2);
    expect(estimateReferenceContribution(20,{...reference,quality:'inconsistent'})).toBeNull();
    expect(estimateReferenceContribution(20,{...reference,basis:'dry_matter'})).toBeNull();
    expect(estimateReferenceContribution(20,{...reference,unit:'Mcal/kg'})).toBeNull();
    expect(estimateReferenceContribution(20,{...reference,unit:'1000IU/kg'})).toBeNull();
  });
  it('쌀의 전분을 탄수화물과 연결하지만 정성 관계로 함량을 생성하지 않는다', () => {
    expect(materialNutrientRoles([rice])).toEqual(['전분 → 탄수화물']);
    expect(estimateMaterialContribution(20, rice)).toBeNull();
  });
  it('명시된 배합비와 같은 기준의 원료 수치만 참고 추정에 사용한다', () => {
    const reference = { ...rice, amount: 80, unit: 'g/100g' as const, basis: 'as_fed' as const };
    expect(estimateMaterialContribution(20, reference)?.gramsPer100g).toBe(16);
    expect(estimateMaterialContribution(undefined, reference)).toBeNull();
    expect(estimateMaterialContribution(20, { ...reference, basis: 'dry_matter' })).toBeNull();
    for (const value of [-1, 101, NaN, Infinity]) expect(estimateMaterialContribution(value, reference)).toBeNull();
    expect(estimateMaterialContribution(0, reference)?.gramsPer100g).toBe(0);
  });
  it('mg/kg의 질량 단위를 정확히 변환한다', () => {
    expect(estimateMaterialContribution(10, { ...rice, amount: 1000, unit: 'mg/kg', basis: 'as_fed' })?.gramsPer100g).toBeCloseTo(0.01);
  });
});

describe('원료의 정확한 동일성', () => {
  const registry = [
    { id: 'rice', canonicalName: '쌀', aliases: ['Rice'] },
    { id: 'bran', canonicalName: '쌀겨' },
    { id: 'mcp', canonicalName: '인산칼슘 (제일)', aliases: ['제일인산칼슘'] },
    { id: 'dcp', canonicalName: '인산칼슘 (제이)' },
    { id: 'fish', canonicalName: '어유', aliases: ['생선 오일'] },
  ];
  it('배합량·괄호 원문을 보존하며 알려진 원료를 연결한다', () => {
    const items = parseIngredientLabelItems('Ｒｉｃｅ 20%, 생선 오일(혼합 토코페롤로 보존), 인산칼슘 (제일), 쌀겨');
    expect(matchCanonicalIngredients(items, registry).map(i => i.canonicalIngredientId)).toEqual(['rice','fish','mcp','bran']);
    expect(matchCanonicalIngredients(items, registry)[0].percentage).toBe(20);
    expect(matchCanonicalIngredients(items, registry)[1].rawText).toContain('토코페롤');
  });
  it('일반 인산칼슘·가수분해 쌀·쌀겨를 쌀이나 특정 인산염으로 추측하지 않는다', () => {
    expect(matchCanonicalIngredients(parseIngredientLabelItems('인산칼슘, 가수분해 쌀'), registry).every(i => i.matchStatus === 'unmatched')).toBe(true);
  });
  it('중복 별칭은 하나를 임의 선택하지 않는다', () => {
    const result = matchCanonicalIngredients(parseIngredientLabelItems('rice'), [...registry, { id:'other',canonicalName:'다른 원료',aliases:['Rice'] }]);
    expect(result[0].matchStatus).toBe('ambiguous');
    expect(result[0].canonicalIngredientId).toBeNull();
  });
});
