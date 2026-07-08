import { describe, it, expect } from 'vitest';
import { scanIngredientRisks, type ScanProduct } from './petSafety';

const prod = (id: string, name: string, ings: [string, string][]): ScanProduct => ({
  id,
  name,
  brand: '테스트',
  imageUrl: '',
  ingredients: ings.map(([nameKo, riskLevel]) => ({ nameKo, riskLevel })),
});

describe('scanIngredientRisks', () => {
  it('위험(danger) 등급 성분은 프로필과 무관하게 표시한다', () => {
    const scan = scanIngredientRisks([prod('1', 'A사료', [['BHA', 'danger'], ['닭고기', 'safe']])], { allergies: [] });
    expect(scan.flaggedCount).toBe(1);
    expect(scan.dangerNames).toContain('BHA');
    expect(scan.flagged[0].hits).toContain('BHA');
  });

  it('프로필 알레르기와 매칭되는 성분을 찾는다', () => {
    const scan = scanIngredientRisks([prod('1', 'A사료', [['닭고기', 'safe']])], { allergies: ['닭고기'] });
    expect(scan.flaggedCount).toBe(1);
    expect(scan.allergenNames).toContain('닭고기');
  });

  it('사전 allergenTags를 통해 별칭 성분도 매칭한다', () => {
    // '닭' 은 chicken 사전 별칭 → allergenTags: chicken/poultry
    const scan = scanIngredientRisks([prod('1', 'A사료', [['닭', 'safe']])], { allergies: ['닭고기'] });
    expect(scan.flaggedCount).toBe(1);
  });

  it('알레르기·위험이 없으면 아무것도 표시하지 않는다', () => {
    const scan = scanIngredientRisks([prod('1', 'A사료', [['고구마', 'safe']])], { allergies: ['소고기'] });
    expect(scan.flaggedCount).toBe(0);
    expect(scan.flagged).toEqual([]);
  });

  it('여러 제품을 스캔하고 걸린 제품만 반환한다', () => {
    const scan = scanIngredientRisks(
      [
        prod('1', '안전사료', [['고구마', 'safe']]),
        prod('2', '위험사료', [['자일리톨', 'danger']]),
        prod('3', '알러지사료', [['소고기', 'safe']]),
      ],
      { allergies: ['소고기'] },
    );
    expect(scan.flaggedCount).toBe(2);
    expect(scan.flagged.map((f) => f.id).sort()).toEqual(['2', '3']);
  });
});
