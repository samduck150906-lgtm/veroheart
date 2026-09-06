import { describe, expect, it } from 'vitest';
import {
  classifyLegacyIngredientConcernEvidence,
  isAnatomicalHeartSourcePartName,
} from './anatomicalHeartEvidence';

describe('anatomical heart source-part classifier', () => {
  it.each([
    ['닭고기 심장', 'Chicken Heart'],
    ['토끼 심장', 'Rabbit Heart'],
    [' 닭 고기 의 심장 ', ''],
    ['', 'CHICKEN-HEART'],
    ['', 'rabbit hearts'],
    ['오리 심장', 'Duck Heart'],
    ['칠면조심장', 'Turkey Hearts'],
    ['소고기 심장', 'Beef Heart'],
    ['돼지 심장', 'Pork Heart'],
    ['양 심장', 'Lamb Heart'],
    ['사슴 심장', 'Venison Heart'],
    ['염소 심장', 'Goat Heart'],
    ['말 심장', 'Horse Heart'],
    ['캥거루 심장', 'Kangaroo Heart'],
  ])('recognizes animal-heart identity across normalized variants: %s / %s', (nameKo, nameEn) => {
    expect(isAnatomicalHeartSourcePartName(nameKo, nameEn)).toBe(true);
  });

  it.each([
    ['효소 심장 건강 배합', ''],
    ['채소 심장 건강 배합', ''],
    ['발효 효소 심장 포뮬러', ''],
    ['심장사상충 예방 원료', 'heartworm support'],
    ['타우린', 'taurine'],
    ['심장 건강 배합', 'heart health formula'],
    ['아티초크', 'artichoke heart'],
    ['', 'heart'],
  ])('does not broadly classify unrelated heart text: %s / %s', (nameKo, nameEn) => {
    expect(isAnatomicalHeartSourcePartName(nameKo, nameEn)).toBe(false);
  });

  it.each([
    '효소 심장 건강 배합',
    '채소 심장 건강 배합',
    '발효 효소 심장 포뮬러',
  ])('retains a non-anatomical Korean legacy heart-name match: %s', (nameKo) => {
    expect(classifyLegacyIngredientConcernEvidence('심장', {
      nameKo,
      nameEn: '',
      purpose: '',
    })).toMatchObject({
      concernId: 'heart',
      rawNameMatches: true,
      anatomicalHeartNameCollision: false,
      eligibleNameMatches: true,
      matches: true,
    });
  });

  it('uses the canonical concern resolver and leaves non-heart concerns unchanged', () => {
    const ingredient = { nameKo: '닭고기 심장', nameEn: 'Chicken Heart', purpose: '' };
    expect(classifyLegacyIngredientConcernEvidence('심장', ingredient)).toMatchObject({
      concernId: 'heart',
      rawNameMatches: true,
      anatomicalHeartNameCollision: true,
      eligibleNameMatches: false,
      matches: false,
    });
    expect(classifyLegacyIngredientConcernEvidence('heart', ingredient)).toMatchObject({
      concernId: 'heart',
      anatomicalHeartNameCollision: true,
      matches: false,
    });
    expect(classifyLegacyIngredientConcernEvidence('관절', {
      nameKo: '관절 지원 성분',
      nameEn: 'joint support ingredient',
      purpose: '',
    })).toMatchObject({
      concernId: 'joint',
      rawNameMatches: true,
      anatomicalHeartNameCollision: false,
      eligibleNameMatches: true,
      matches: true,
    });
  });

  it('keeps explicit purpose and independent non-anatomical name evidence eligible', () => {
    expect(classifyLegacyIngredientConcernEvidence('심장', {
      nameKo: '닭고기 심장',
      nameEn: 'Chicken Heart',
      purpose: '심장 건강 지원',
    })).toMatchObject({
      purposeMatches: true,
      anatomicalHeartNameCollision: true,
      eligibleNameMatches: false,
      matches: true,
    });
    expect(classifyLegacyIngredientConcernEvidence('심장', {
      nameKo: '심장 건강 배합',
      nameEn: '',
      purpose: '',
    })).toMatchObject({
      rawNameMatches: true,
      anatomicalHeartNameCollision: false,
      eligibleNameMatches: true,
      matches: true,
    });
  });

  it('is deterministic and does not mutate its input', () => {
    const ingredient = { nameKo: '토끼 심장', nameEn: 'Rabbit Hearts', purpose: '' };
    const before = structuredClone(ingredient);
    const first = classifyLegacyIngredientConcernEvidence('심장', ingredient);
    const second = classifyLegacyIngredientConcernEvidence('심장', ingredient);
    expect(second).toEqual(first);
    expect(ingredient).toEqual(before);
  });
});
