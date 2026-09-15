import { describe, expect, it } from 'vitest';
import {
  RISK_REFERENCES,
  findMissingRiskIngredients,
  findRiskConflicts,
  findRiskUpgrades,
  normalizeIngredientName,
  reviewIngredientRisks,
  type ReviewedIngredient,
} from './ingredientRiskReview';

function ingredient(
  name_ko: string,
  risk_level: ReviewedIngredient['risk_level'],
  extra: Partial<ReviewedIngredient> = {},
): ReviewedIngredient {
  return { id: `id-${name_ko}`, name_ko, name_en: null, risk_level, category: null, ...extra };
}

/**
 * 이 제안은 사람이 확인한 뒤 위험도를 바꾸는 데 쓰인다. 위험도는 보호자가 급여
 * 여부를 정하는 값이라, "무엇을 잡아내는가"만큼 "무엇을 잘못 잡지 않는가"가
 * 중요하다. 한 글자 차이로 뜻이 달라지는 이름들을 집중적으로 검사한다.
 */
describe('성분 위험도 검수', () => {
  describe('이름 정규화', () => {
    it('공백과 구두점을 지워 같은 물질을 묶는다', () => {
      expect(normalizeIngredientName('프로필렌 글리콜')).toBe(normalizeIngredientName('프로필렌글리콜'));
      expect(normalizeIngredientName('B.H.A')).toBe(normalizeIngredientName('BHA'));
      expect(normalizeIngredientName('소르빈산 칼륨 (보존제)')).toBe('소르빈산칼륨보존제');
    });
  });

  describe('표기 불일치', () => {
    it('영문명이 같은데 위험도가 다르면 가장 높은 쪽으로 제안한다', () => {
      const findings = findRiskConflicts([
        ingredient('아질산나트륨', 'danger', { name_en: 'Sodium Nitrite' }),
        ingredient('소듐 나이트라이트', 'caution', { name_en: 'Sodium Nitrite' }),
      ]);
      expect(findings).toHaveLength(1);
      expect(findings[0].ingredient?.name_ko).toBe('소듐 나이트라이트');
      expect(findings[0].suggestedLevel).toBe('danger');
      expect(findings[0].siblings?.[0].name_ko).toBe('아질산나트륨');
    });

    it('위험도가 같으면 표기가 여러 개여도 후보로 만들지 않는다', () => {
      const findings = findRiskConflicts([
        ingredient('혼합 토코페롤', 'safe', { name_en: 'Mixed Tocopherols' }),
        ingredient('혼합토코페롤', 'safe', { name_en: 'Mixed Tocopherols' }),
      ]);
      expect(findings).toHaveLength(0);
    });

    it('영문명이 없으면 한글명으로 묶는다', () => {
      const findings = findRiskConflicts([
        ingredient('프로필렌 글리콜', 'danger'),
        ingredient('프로필렌글리콜', 'safe'),
      ]);
      expect(findings).toHaveLength(1);
      expect(findings[0].suggestedLevel).toBe('danger');
    });
  });

  describe('기준표보다 낮게 분류된 성분', () => {
    it('안전으로 등록된 자일리톨을 위험 후보로 올린다', () => {
      const findings = findRiskUpgrades([ingredient('자일리톨', 'safe')]);
      expect(findings).toHaveLength(1);
      expect(findings[0].suggestedLevel).toBe('danger');
      expect(findings[0].reason).toContain('저혈당');
    });

    it('기준표보다 엄격하게 잡아 둔 값은 되돌리지 않는다', () => {
      // 카라기난 기준은 '주의'인데 사전이 '위험'으로 뒀다 — 운영자 판단을 존중한다.
      expect(findRiskUpgrades([ingredient('카라기난', 'danger')])).toHaveLength(0);
    });

    it('이미 기준과 같은 위험도면 후보로 만들지 않는다', () => {
      expect(findRiskUpgrades([ingredient('카라기난', 'caution')])).toHaveLength(0);
    });

    it('포도당(글루코스)을 포도로 잘못 잡지 않는다', () => {
      expect(findRiskUpgrades([ingredient('포도당', 'safe')])).toHaveLength(0);
      expect(findRiskUpgrades([ingredient('포도씨유', 'safe')])).toHaveLength(0);
    });

    it('건포도는 포도 기준으로 잡는다', () => {
      const findings = findRiskUpgrades([ingredient('건포도', 'safe')]);
      expect(findings).toHaveLength(1);
      expect(findings[0].suggestedLevel).toBe('danger');
    });

    it('디카페인은 카페인으로 잡지 않는다', () => {
      expect(findRiskUpgrades([ingredient('디카페인 녹차 추출물', 'safe')])).toHaveLength(0);
    });

    it('표기가 달라도 같은 물질로 잡는다', () => {
      const findings = findRiskUpgrades([
        ingredient('부틸히드록시아니솔', 'safe'),
        ingredient('B.H.A', 'safe'),
      ]);
      expect(findings).toHaveLength(2);
      expect(findings.every((item) => item.suggestedLevel === 'danger')).toBe(true);
    });

    it('한 성분에 대해 제안은 하나만 만든다', () => {
      // '초콜릿 코코아 분말'은 초콜릿·카카오 기준에 여러 번 걸린다.
      expect(findRiskUpgrades([ingredient('초콜릿 코코아 분말', 'safe')])).toHaveLength(1);
    });

    it('출처가 명시된 동물성 지방은 잡지 않는다', () => {
      expect(findRiskUpgrades([ingredient('닭지방', 'safe')])).toHaveLength(0);
      expect(findRiskUpgrades([ingredient('동물성지방', 'safe')])).toHaveLength(1);
    });
  });

  describe('사전에 누락된 위험 성분', () => {
    it('사전에 전혀 없는 기준표 성분을 찾아낸다', () => {
      const findings = findMissingRiskIngredients([ingredient('닭고기', 'safe')]);
      expect(findings.length).toBe(RISK_REFERENCES.length);
      expect(findings.every((item) => item.kind === 'missing')).toBe(true);
      expect(findings.every((item) => item.currentLevel === null)).toBe(true);
    });

    it('사전에 이미 있으면 누락으로 보지 않는다', () => {
      const findings = findMissingRiskIngredients([ingredient('자일리톨', 'danger')]);
      expect(findings.some((item) => item.reference?.nameKo === '자일리톨')).toBe(false);
    });

    it('위험도가 낮게 등록돼 있어도 누락은 아니다', () => {
      // 이 경우는 '누락'이 아니라 '재분류' 후보로 잡혀야 한다.
      const dictionary = [ingredient('양파 분말', 'safe')];
      expect(findMissingRiskIngredients(dictionary).some((f) => f.reference?.nameKo === '양파')).toBe(false);
      expect(findRiskUpgrades(dictionary)).toHaveLength(1);
    });
  });

  describe('전체 검수', () => {
    it('영향이 큰 성분부터 보여 준다', () => {
      const findings = reviewIngredientRisks([
        ingredient('자일리톨', 'safe', { productCount: 3 }),
        ingredient('양파 분말', 'safe', { productCount: 120 }),
      ]);
      const upgrades = findings.filter((item) => item.kind === 'upgrade');
      expect(upgrades[0].ingredient?.name_ko).toBe('양파 분말');
    });

    it('빈 사전에도 안전하게 동작한다', () => {
      const findings = reviewIngredientRisks([]);
      expect(findings.every((item) => item.kind === 'missing')).toBe(true);
    });
  });

  describe('기준표 자체', () => {
    it('모든 항목이 근거와 패턴을 갖는다', () => {
      for (const reference of RISK_REFERENCES) {
        expect(reference.reason.length, `${reference.nameKo} 근거 누락`).toBeGreaterThan(10);
        expect(reference.patterns.length, `${reference.nameKo} 패턴 누락`).toBeGreaterThan(0);
        expect(reference.patterns.every((p) => p.trim().length > 0)).toBe(true);
      }
    });

    it('대표 이름이 자기 기준에 스스로 걸린다', () => {
      // 기준표에 있는 이름을 그대로 등록하면 '누락'이 사라져야 한다.
      for (const reference of RISK_REFERENCES) {
        const dictionary = [ingredient(reference.nameKo, reference.level)];
        const missing = findMissingRiskIngredients(dictionary);
        expect(
          missing.some((item) => item.reference?.nameKo === reference.nameKo),
          `${reference.nameKo} 가 자기 패턴에 걸리지 않는다`,
        ).toBe(false);
      }
    });
  });
});
