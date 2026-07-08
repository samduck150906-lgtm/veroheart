import { describe, it, expect } from 'vitest';
import { concernsToDiseaseIds } from './adapter';
import { evaluateDiseases } from './breedDiseaseEngine';

describe('concernsToDiseaseIds — 건강 고민 라벨 → 질환 ID', () => {
  it('알려진 라벨을 질환 ID로 매핑하고 미지원 항목(면역)은 제외한다', () => {
    expect(concernsToDiseaseIds(['관절', '심장', '면역', '신장·비뇨기'])).toEqual(['joint', 'heart', 'kidney']);
  });

  it('중복을 제거한다', () => {
    expect(concernsToDiseaseIds(['관절', '관절'])).toEqual(['joint']);
  });

  it('빈 입력·undefined를 안전하게 처리한다', () => {
    expect(concernsToDiseaseIds([])).toEqual([]);
    expect(concernsToDiseaseIds(undefined)).toEqual([]);
  });
});

describe('evaluateDiseases — 질환별 NRC 정량 규칙 평가', () => {
  const product = {
    ingredients: [
      { nameKo: '글루코사민', nameEn: 'glucosamine' },
      { nameKo: '닭고기', nameEn: 'chicken' },
    ],
    // 인(P) 과다 + Ca:P 비율 1.2 (적정)
    guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, moisture: 10, phosphorus: 1.5, calcium: 1.8 },
  };

  it('신장: 인 과다는 fail, 칼슘:인 비율 적정은 pass로 판정한다', () => {
    const res = evaluateDiseases(['kidney'], product);
    const kidney = res.find((r) => r.disease.id === 'kidney');
    expect(kidney).toBeTruthy();
    const ph = kidney!.ruleChecks.find((rc) => rc.rule.nutrientKey === 'phosphorus_per1000kcal');
    expect(ph?.status).toBe('fail');
    const ratio = kidney!.ruleChecks.find((rc) => rc.rule.nutrientKey === 'calcium_phosphorus_ratio');
    expect(ratio?.status).toBe('pass');
    // 보조 성분 갭 + 임상 노트 제공
    expect(kidney!.supplementGaps.length).toBeGreaterThan(0);
    expect(kidney!.disease.clinicalNote).toContain('수의사');
  });

  it('관절: 원료 목록에 글루코사민이 있으면 pass로 판정한다', () => {
    const res = evaluateDiseases(['joint'], product);
    const joint = res.find((r) => r.disease.id === 'joint');
    const glu = joint!.ruleChecks.find((rc) => rc.rule.nutrientKey === 'glucosamine_per1000kcal');
    expect(glu?.status).toBe('pass');
  });

  it('GA·성분이 없으면 정량 항목은 unknown으로 안전 처리한다', () => {
    const res = evaluateDiseases(['kidney'], { ingredients: [] });
    const kidney = res[0];
    expect(kidney.ruleChecks.every((rc) => rc.status === 'unknown')).toBe(true);
  });
});
