import { describe, expect, it } from 'vitest';
import { productImageUrl } from './productImage';
import { mapProductFromSupabaseRow } from '../lib/supabaseRowTypes';

describe('product image identity', () => {
  it('never substitutes unrelated stock photography for a missing product photo', () => {
    const product = { id: 'p', name: '사료', brand_name: '브랜드', product_type: 'food' };
    expect(mapProductFromSupabaseRow(product).imageUrl).toBe('');
    expect(mapProductFromSupabaseRow({ ...product, image_url: 'https://images.unsplash.com/photo-unrelated' }).imageUrl).toBe('');
    expect(productImageUrl('javascript:alert(1)')).toBe('');
  });

  it('retains actual manufacturer and product storage photos', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/product-images/product.jpg';
    expect(productImageUrl(url)).toBe(url);
  });
});
