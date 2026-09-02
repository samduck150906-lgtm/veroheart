import { describe, expect, it } from 'vitest';
import {
  HEALTH_CONCERN_DEFINITIONS,
  HEALTH_CONCERN_IDS,
  HEALTH_CONCERN_OPTIONS,
  canonicalizeHealthConcerns,
  getConcernAliases,
  healthConcernLabelsFromIds,
  resolveHealthConcernId,
  type ConcernEvidenceLevel,
  type ConcernStatus,
  type DataConfidence,
  type RecommendationEligibility,
} from './concerns';

describe('canonical health concern contract', () => {
  it('maps the nine profile choices exactly once and in profile display order', () => {
    expect(HEALTH_CONCERN_IDS).toEqual([
      'skin_coat',
      'joint',
      'digestive',
      'weight',
      'renal_urinary',
      'heart',
      'immune',
      'eye',
      'oral',
    ]);

    expect(HEALTH_CONCERN_OPTIONS).toEqual([
      '피부·모질',
      '관절',
      '소화기',
      '비만·다이어트',
      '신장·비뇨기',
      '심장',
      '면역',
      '눈',
      '구강',
    ]);

    const labels = HEALTH_CONCERN_IDS.map((id) => HEALTH_CONCERN_DEFINITIONS[id].label);
    expect(new Set(labels).size).toBe(9);
  });

  it.each([
    ['피부·모질', 'skin_coat'],
    ['피부', 'skin_coat'],
    ['모질', 'skin_coat'],
    ['피모', 'skin_coat'],
    ['skin', 'skin_coat'],
    ['관절', 'joint'],
    ['joint', 'joint'],
    ['소화기', 'digestive'],
    ['소화', 'digestive'],
    ['장 건강', 'digestive'],
    ['위장', 'digestive'],
    ['비만·다이어트', 'weight'],
    ['비만', 'weight'],
    ['다이어트', 'weight'],
    ['체중 관리', 'weight'],
    ['신장·비뇨기', 'renal_urinary'],
    ['신장', 'renal_urinary'],
    ['비뇨기', 'renal_urinary'],
    ['요로', 'renal_urinary'],
    ['방광', 'renal_urinary'],
    ['심장', 'heart'],
    ['cardiac', 'heart'],
    ['면역', 'immune'],
    ['immunity', 'immune'],
    ['눈', 'eye'],
    ['눈 건강', 'eye'],
    ['구강', 'oral'],
    ['치아', 'oral'],
  ] as const)('resolves alias %s to canonical id %s', (input, expected) => {
    expect(resolveHealthConcernId(input)).toBe(expected);
  });

  it('dedupes duplicate profile concerns after alias resolution and drops unknown input', () => {
    expect(canonicalizeHealthConcerns(['관절', 'joint', '소화', '알 수 없음', '장 건강'])).toEqual([
      'joint',
      'digestive',
    ]);
  });

  it('round-trips canonical ids back to user-facing profile labels', () => {
    expect(healthConcernLabelsFromIds(['skin_coat', 'renal_urinary', 'immune'])).toEqual([
      '피부·모질',
      '신장·비뇨기',
      '면역',
    ]);
  });

  it('keeps aliases centralized on definitions instead of duplicated ad hoc lists', () => {
    for (const id of HEALTH_CONCERN_IDS) {
      expect(getConcernAliases(id)).toContain(HEALTH_CONCERN_DEFINITIONS[id].label);
      expect(getConcernAliases(id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('exports the status, evidence, confidence, and eligibility vocabularies required by later evaluators', () => {
    const statuses: ConcernStatus[] = ['supported', 'possible', 'tag_only', 'not_supported', 'unknown', 'not_applicable'];
    const evidenceLevels: ConcernEvidenceLevel[] = [
      'validated_quantitative',
      'tag_and_ingredient_quantity_unknown',
      'tag_only',
      'ingredient_only_quantity_unknown',
      'missing',
      'contradictory',
      'not_applicable',
    ];
    const confidence: DataConfidence[] = ['sufficient', 'partial', 'insufficient'];
    const eligibility: RecommendationEligibility[] = ['eligible', 'limited', 'blocked', 'unknown'];

    expect(statuses).toHaveLength(6);
    expect(evidenceLevels).toHaveLength(7);
    expect(confidence).toHaveLength(3);
    expect(eligibility).toHaveLength(4);
  });
});
