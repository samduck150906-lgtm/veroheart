import { describe, expect, it } from 'vitest';
import { parseProductLabel } from './productLabelParse';

describe('제품 라벨 원문 파싱', () => {
  it('원재료와 보증성분을 한 번에 뽑는다', () => {
    const label = `
원재료명: 닭고기(30%), 현미, 감자전분, 비트펄프, 연어유, 탄산칼슘 1%, 비타민E 등
보증성분: 조단백질 30% 이상, 조지방 18% 이상, 조섬유 3% 이하, 조회분 8% 이하,
수분 10% 이하, 칼슘 1.2% 이상, 인 1.0% 이상
`;
    const parsed = parseProductLabel(label);

    expect(parsed.ingredients).toEqual([
      '닭고기', '현미', '감자전분', '비트펄프', '연어유', '탄산칼슘', '비타민E',
    ]);
    expect(parsed.nutrition).toEqual({
      crude_protein: 30,
      crude_fat: 18,
      crude_fiber: 3,
      crude_ash: 8,
      moisture: 10,
      calcium: 1.2,
      phosphorus: 1,
    });
  });

  it('원재료 표기 순서를 그대로 지킨다', () => {
    // 분석 엔진이 첫 번째 원료로 '제1원료'를 판정한다. 순서가 바뀌면 판정이 바뀐다.
    const parsed = parseProductLabel('원재료: 쌀, 닭고기, 옥수수');
    expect(parsed.ingredients[0]).toBe('쌀');
    expect(parsed.ingredients).toEqual(['쌀', '닭고기', '옥수수']);
  });

  it('원재료에 섞인 칼슘·인 표기를 보증성분으로 읽지 않는다', () => {
    // '탄산칼슘 1%', '인산칼슘 0.5%' 는 원료 함량이지 보증성분이 아니다.
    // 여기서 잘못 읽으면 라벨에 없는 수치가 제품에 붙는다.
    const parsed = parseProductLabel('원재료명: 닭고기, 탄산칼슘 1%, 인산칼슘 0.5%, 소금');
    expect(parsed.nutrition).toEqual({});
    expect(parsed.ingredients).toContain('탄산칼슘');
  });

  it('구간 표기가 없으면 항목이 충분히 모였을 때만 보증성분을 인정한다', () => {
    const tooFew = parseProductLabel('조단백질 30% 이상');
    expect(tooFew.nutrition).toEqual({});

    const enough = parseProductLabel('조단백질 30%, 조지방 18%, 수분 10%');
    expect(enough.nutrition).toEqual({ crude_protein: 30, crude_fat: 18, moisture: 10 });
  });

  it('괄호·함량·중복·불릿을 정리한다', () => {
    const parsed = parseProductLabel(`원재료
- 닭고기 (생, 25%)
- 현미
- 닭고기
1) 연어유`);
    expect(parsed.ingredients).toEqual(['닭고기', '현미', '연어유']);
  });

  it('백분율로 말이 안 되는 값은 버린다', () => {
    // 'kcal 350' 처럼 옆에 있는 숫자를 잘못 집는 경우를 막는다.
    const parsed = parseProductLabel('보증성분: 조단백질 350, 조지방 18%, 수분 10%');
    expect(parsed.nutrition.crude_protein).toBeUndefined();
    expect(parsed.nutrition.crude_fat).toBe(18);
  });

  it('영문 라벨도 읽는다', () => {
    const parsed = parseProductLabel(`Ingredients: Chicken, Brown rice, Salmon oil
Guaranteed Analysis: Crude Protein 32%, Crude Fat 16%, Crude Fiber 4%, Moisture 10%`);
    expect(parsed.ingredients).toEqual(['Chicken', 'Brown rice', 'Salmon oil']);
    expect(parsed.nutrition).toMatchObject({ crude_protein: 32, crude_fat: 16, crude_fiber: 4, moisture: 10 });
  });

  it('설명 문장은 원재료로 보지 않는다', () => {
    const parsed = parseProductLabel('원재료: 닭고기, 본 제품은 반려견의 건강을 생각하여 국내에서 정성껏 만들었습니다');
    expect(parsed.ingredients).toEqual(['닭고기']);
  });

  it('빈 입력은 빈 결과를 준다', () => {
    expect(parseProductLabel('')).toEqual({ ingredients: [], nutrition: {} });
    expect(parseProductLabel('   \n  ')).toEqual({ ingredients: [], nutrition: {} });
  });
});
