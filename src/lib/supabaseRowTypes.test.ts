import { describe, expect, it } from 'vitest';
import { mapProductFromSupabaseRow } from './supabaseRowTypes';
import type { SupabaseProductRow } from './supabaseRowTypes';

describe('mapProductFromSupabaseRow', () => {
  it('maps DB row to Product including ingredients', () => {
    const row: SupabaseProductRow = {
      id: 'p1',
      brand_name: 'Brand',
      name: 'Food',
      product_type: 'dry',
      image_url: null,
      review_count: 3,
      avg_rating: 4.2,
      target_pet_type: 'dog',
      verification_status: 'verified',
      product_ingredients: [
        {
          ingredients: {
            id: 'i1',
            name_ko: '닭고기',
            name_en: 'chicken',
            risk_level: 'safe',
            description: '단백',
          },
        },
        {
          ingredients: {
            id: 'i2',
            name_ko: 'BHA',
            name_en: null,
            risk_level: 'danger',
            description: null,
          },
        },
      ],
    };
    const p = mapProductFromSupabaseRow(row);
    expect(p.id).toBe('p1');
    expect(p.brand).toBe('Brand');
    expect(p.ingredients).toHaveLength(2);
    expect(p.ingredients[0].riskLevel).toBe('safe');
    expect(p.ingredients[1].riskLevel).toBe('danger');
  });

  it('maps warning risk_level to caution', () => {
    const row: SupabaseProductRow = {
      id: 'p2',
      brand_name: 'B',
      name: 'N',
      product_type: 't',
      product_ingredients: [
        { ingredients: { id: 'x', name_ko: 'y', risk_level: 'warning', description: '' } },
      ],
    };
    const p = mapProductFromSupabaseRow(row);
    expect(p.ingredients[0].riskLevel).toBe('caution');
  });

  it('preserves a raw retailer title while mapping clean catalog fields', () => {
    const row: SupabaseProductRow = {
      id: 'p3',
      brand_name: '오리젠',
      name: '오리젠 공식 사료 1개 로켓배송',
      display_name: '오리지널 독',
      variant_name: '닭고기 · 성견',
      net_weight_text: '2kg',
      slug: 'orijen-original-dog',
      catalog_source: 'community_scan',
      analysis_status: 'partial',
      product_type: 'food',
      verification_status: 'reviewed',
    };

    const product = mapProductFromSupabaseRow(row);

    expect(product.name).toBe('오리젠 공식 사료 1개 로켓배송');
    expect(product.displayName).toBe('오리지널 독');
    expect(product.variantName).toBe('닭고기 · 성견');
    expect(product.netWeightText).toBe('2kg');
    expect(product.slug).toBe('orijen-original-dog');
    expect(product.catalogSource).toBe('community_scan');
    expect(product.analysisStatus).toBe('partial');
    expect(product.verificationStatus).toBe('reviewed');
  });
});
