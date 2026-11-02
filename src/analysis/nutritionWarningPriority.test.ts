import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import { analyzeFeed } from './feedAnalysis';
import { NUTRITION_INSUFFICIENT_NOTICE } from './nutritionReadiness';
import { generateAnalysisReport } from '../utils/analysis';
import { buildProductConclusion } from '../utils/productConclusion';

const profile: UserPetProfile = { id: 'synthetic-pet', name: '합성 프로필', species: 'Dog', age: 4, allergies: [], healthConcerns: [] };
const base: Product = { id: 'synthetic-food', name: '합성 사료', brand: '합성', category: 'food', imageUrl: '',
  ingredients: [{ id: 'synthetic-ingredient', nameKo: '연어', nameEn: '', purpose: '', riskLevel: 'safe' }],
  reviewsCount: 0, averageRating: 0 };

describe('assessed warnings take precedence over general nutrition scope copy', () => {
  it.each([0, 2])('keeps confirmed protein/fat deficits with partial nutrition (%s)', value => {
    const product = { ...base, guaranteedAnalysis: { crudeProtein: value, crudeFat: value, moisture: 10 } };
    const before = structuredClone(product);
    const feed = analyzeFeed(product, profile);
    expect(feed.aafco.evaluated).toBe(true);
    expect(feed.aafco.passed).toBe(false);
    const report = generateAnalysisReport(product, profile);
    const conclusion = buildProductConclusion(product, profile, report);
    for (const text of [feed.summary, report.summary, conclusion.subline!]) {
      expect(text).toContain('기준 미달');
      expect(text).toContain(NUTRITION_INSUFFICIENT_NOTICE);
    }
    expect(conclusion.tone).toBe('caution');
    expect(product).toEqual(before);
  });

  it.each([undefined, { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 }])(
    'retains explicit veterinary guidance with missing or complete nutrition', guaranteedAnalysis => {
      const product = { ...base, guaranteedAnalysis, requiresVeterinaryGuidance: true };
      const report = generateAnalysisReport(product, profile);
      expect(report.summary).toContain('수의사 상담');
      expect(buildProductConclusion(product, profile, report).headline).toContain('수의사 상담');
      expect(analyzeFeed(product, profile).summary).toContain('수의사 상담');
    });

  it('keeps species/allergy/danger warnings ahead of assessed nutrition warnings', () => {
    const product = { ...base, requiresVeterinaryGuidance: true,
      guaranteedAnalysis: { crudeProtein: 0, crudeFat: 0, moisture: 10 } };
    const cases = [
      { product: { ...product, targetPetType: 'cat' as const }, pet: profile, report: '동물 종류', conclusion: '제품이 아닙니다' },
      { product, pet: { ...profile, allergies: ['연어'] }, report: '급여를 권하지 않습니다', conclusion: '급여를 권하지 않습니다' },
      { product: { ...product, ingredients: [{ ...base.ingredients[0], riskLevel: 'danger' as const }] }, pet: profile, report: '위험 성분', conclusion: '위험 등급' },
    ];
    for (const c of cases) {
      const report = generateAnalysisReport(c.product, c.pet);
      expect(report.summary).toContain(c.report);
      expect(report.summary).toContain('기준 미달');
      expect(report.summary.indexOf(c.report)).toBeLessThan(report.summary.indexOf('기준 미달'));
      expect(buildProductConclusion(c.product, c.pet, report).headline).toContain(c.conclusion);
    }
  });

  it('does not invent a deficiency from missing measurements or promise full adequacy', () => {
    const missing = generateAnalysisReport(base, profile);
    expect(missing.summary).not.toContain('기준 미달');
    const full = { ...base, guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 } };
    const report = generateAnalysisReport(full, profile);
    expect([report.summary, analyzeFeed(full, profile).summary, buildProductConclusion(full, profile, report).headline].join(' '))
      .not.toMatch(/균형 잡힌|무난하게 급여|완전한 영양|종합 안전/);
  });
  it('retains an assessed calcium/phosphorus warning with partial nutrition', () => {
    const product = { ...base, guaranteedAnalysis: { crudeProtein: 30, calcium: 2, phosphorus: 0.5 } };
    const report = generateAnalysisReport(product, profile);
    for (const text of [analyzeFeed(product, profile).summary, report.summary, buildProductConclusion(product, profile, report).subline!]) {
      expect(text).toContain('칼슘:인 비율');
      expect(text).toContain(NUTRITION_INSUFFICIENT_NOTICE);
    }
  });
});
