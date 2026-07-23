import { describe, it, expect } from 'vitest';
import {
  mapFeedingLogFromRow,
  mapPetProfileFromRow,
  ageGroupFromAge,
  ageFromAgeGroup,
  type SupabaseFeedingLogRow,
} from './supabaseRowTypes';
import type { SupabasePet } from '../types';

describe('mapPetProfileFromRow', () => {
  it('maps weight/breed/image and age_group', () => {
    const row: SupabasePet = {
      id: 'p1',
      user_id: 'u1',
      name: '초코',
      pet_type: 'dog',
      age_group: 'senior',
      weight: '5.20',
      breed: '말티즈',
      image_url: 'https://x/y.png',
      conditions: ['관절'],
      allergies: ['닭고기'],
      created_at: '2026-01-01',
    };
    const p = mapPetProfileFromRow(row);
    expect(p).toMatchObject({
      id: 'p1',
      name: '초코',
      species: 'Dog',
      age: 10,
      weightKg: 5.2,
      breed: '말티즈',
      imageUrl: 'https://x/y.png',
      healthConcerns: ['관절'],
      allergies: ['닭고기'],
    });
  });

  it('handles missing optional columns gracefully', () => {
    const row = {
      id: 'p2',
      user_id: 'u1',
      name: '나비',
      pet_type: 'cat',
      age_group: 'adult',
      conditions: null,
      allergies: null,
      created_at: '2026-01-01',
    } as SupabasePet;
    const p = mapPetProfileFromRow(row);
    expect(p.species).toBe('Cat');
    expect(p.age).toBe(4);
    expect(p.weightKg).toBeUndefined();
    expect(p.breed).toBeUndefined();
    expect(p.healthConcerns).toEqual([]);
  });
});

describe('age <-> age_group round trip', () => {
  it('maps age numbers to groups', () => {
    expect(ageGroupFromAge(1)).toBe('baby');
    expect(ageGroupFromAge(4)).toBe('adult');
    expect(ageGroupFromAge(10)).toBe('senior');
  });
  it('maps groups back to representative ages', () => {
    expect(ageFromAgeGroup('baby')).toBe(1);
    expect(ageFromAgeGroup('adult')).toBe(4);
    expect(ageFromAgeGroup('senior')).toBe(10);
  });
});

describe('mapFeedingLogFromRow', () => {
  it('maps an official-product log with joined product', () => {
    const row: SupabaseFeedingLogRow = {
      id: 'l1',
      user_id: 'u1',
      pet_id: 'p1',
      product_id: 'prod1',
      product_type: 'food',
      custom_product_name: null,
      is_custom_product: false,
      feeding_date: '2026-07-23',
      feeding_time: '08:30:00',
      meal_period: 'morning',
      amount: '50.00',
      unit: 'g',
      memo: '잘 먹음',
      preference_level: 5,
      reaction_note: null,
      image_url: null,
      created_at: '2026-07-23T08:30:00Z',
      updated_at: '2026-07-23T08:30:00Z',
      products: {
        id: 'prod1',
        name: '오리젠 오리지널',
        brand_name: '오리젠',
        image_url: 'https://img',
        product_type: 'food',
      },
    };
    const log = mapFeedingLogFromRow(row);
    expect(log.productType).toBe('food');
    expect(log.mealPeriod).toBe('morning');
    expect(log.feedingTime).toBe('08:30'); // trimmed from HH:MM:SS
    expect(log.amount).toBe(50);
    expect(log.isCustomProduct).toBe(false);
    expect(log.product?.name).toBe('오리젠 오리지널');
  });

  it('maps a custom (직접 입력) log with no product', () => {
    const row: SupabaseFeedingLogRow = {
      id: 'l2',
      user_id: 'u1',
      pet_id: 'p1',
      product_id: null,
      product_type: 'custom',
      custom_product_name: '집밥 닭가슴살',
      is_custom_product: true,
      feeding_date: '2026-07-23',
      feeding_time: null,
      meal_period: null,
      amount: null,
      unit: null,
      memo: null,
      preference_level: null,
      reaction_note: null,
      image_url: null,
      created_at: '2026-07-23T00:00:00Z',
      updated_at: '2026-07-23T00:00:00Z',
      products: null,
    };
    const log = mapFeedingLogFromRow(row);
    expect(log.isCustomProduct).toBe(true);
    expect(log.customProductName).toBe('집밥 닭가슴살');
    expect(log.productId).toBeNull();
    expect(log.product).toBeNull();
    expect(log.amount).toBeNull();
  });

  it('falls back to safe defaults for unknown enum values', () => {
    const row = {
      id: 'l3',
      user_id: 'u1',
      pet_id: 'p1',
      product_id: null,
      product_type: 'weird',
      custom_product_name: 'x',
      is_custom_product: true,
      feeding_date: '2026-07-23',
      feeding_time: null,
      meal_period: 'zzz',
      amount: null,
      unit: null,
      memo: null,
      preference_level: null,
      reaction_note: null,
      image_url: null,
      created_at: '2026-07-23T00:00:00Z',
      updated_at: '2026-07-23T00:00:00Z',
      products: null,
    } as unknown as SupabaseFeedingLogRow;
    const log = mapFeedingLogFromRow(row);
    expect(log.productType).toBe('food');
    expect(log.mealPeriod).toBeNull();
  });
});
