import { describe, expect, it } from 'vitest';
import { analyzeFeed } from './feedAnalysis';
import { readinessFromStoredStatus } from './analysisReadiness';
import type { Product, UserPetProfile } from '../types';
const pet: UserPetProfile = { id: 'dog', name: '초코', species: 'Dog', age: 4, weightKg: 5, healthConcerns: [], allergies: [] };
const base: Product = { id: 'food', name: '사료', brand: '브랜드', category: 'food', imageUrl: '', ingredients: [], reviewsCount: 0, averageRating: 0 };
describe('release nutrition evidence', () => {
  it('uses label kcal without requiring a guaranteed-analysis panel', () => {
    const result = analyzeFeed({ ...base, caloriesPer100g: 100 }, pet);
    expect(result.feeding).toMatchObject({ kcalPer100g: 100, gramsPerDay: 374, measured: true });
    expect(result.calories).toMatchObject({ per100g: 100, measured: true });
  });
  it('keeps inferred calories distinct from measured label energy', () => {
    const result = analyzeFeed({ ...base, guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 } }, pet);
    expect(result.calories?.measured).toBe(false);
    expect(result.feeding?.measured).toBe(false);
  });
  it('does not issue gram recommendations from an invented 380kcal default', () => {
    expect(analyzeFeed(base, pet).feeding).toBeNull();
  });
  it('does not estimate feeding energy from an incomplete proximate panel', () => {
    const result = analyzeFeed({ ...base, guaranteedAnalysis: { crudeProtein: 30 } }, pet);
    expect(result.feeding).toBeNull();
    expect(result.macros).toBeNull();
    expect(result.macrosDMB).toBeNull();
    expect(result.aafco.evaluated).toBe(false);
    expect(result.cautions.some(text => text.includes('탄수화물') || text.includes('기준 미달'))).toBe(false);
  });
  it('computes only supported dry matter fields and requires observed moisture', () => {
    const result = analyzeFeed({ ...base, guaranteedAnalysis: { crudeProtein: 27, crudeFat: 10, moisture: 10 } }, pet);
    expect(result.macros).toBeNull();
    expect(result.macrosDMB).toMatchObject({ protein: 30, fiber: null, carb: null });
    expect(result.aafco.evaluated).toBe(true);
    expect(analyzeFeed({ ...base, guaranteedAnalysis: { crudeProtein: 27, crudeFat: 10 } }, pet).aafco.evaluated).toBe(false);
  });
  it('distinguishes an explicitly observed zero from a missing nutrient', () => {
    const result = analyzeFeed({ ...base, guaranteedAnalysis: { crudeProtein: 0, crudeFat: 0, moisture: 10 } }, pet);
    expect(result.hasNutritionData).toBe(true);
    expect(result.aafco.evaluated).toBe(true);
    expect(result.aafco.passed).toBe(false);
  });
  it('does not recommend a general feeding amount for veterinary diets', () => {
    expect(analyzeFeed({ ...base, caloriesPer100g: 100, requiresVeterinaryGuidance: true }, pet).feeding).toBeNull();
  });
  it('does not let stored ready override absent or unresolved evidence', () => {
    expect(readinessFromStoredStatus('ready', 0).status).toBe('unavailable');
    expect(readinessFromStoredStatus('ready', 1, 2).status).toBe('partial');
    const result = analyzeFeed({ ...base, analysisStatus: 'ready' }, pet);
    expect(result.positives.some(value => value.includes('확인되지 않았어요'))).toBe(false);
  });
});
