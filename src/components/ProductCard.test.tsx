import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import ProductCard from './ProductCard';

const product: Product = {
  id: 'product-1',
  brand: '쿠팡검색',
  name: '쿠팡 무료배송 오리젠 오리지널 독 2개',
  displayName: '오리지널 독',
  variantName: '닭고기 · 성견',
  netWeightText: '2kg',
  catalogSource: 'community_scan',
  verificationStatus: 'pending',
  category: '사료',
  imageUrl: 'https://example.com/product.jpg',
  ingredients: [],
  reviewsCount: 0,
  averageRating: 0,
};

describe('ProductCard catalog identity', () => {
  it('정제된 이름·메타·검증 배지만 표시하고 원문과 수집 출처 브랜드는 숨긴다', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} compact />
      </MemoryRouter>,
    );

    expect(screen.getByText('오리지널 독')).toBeTruthy();
    expect(screen.getByText('닭고기 · 성견 · 2kg')).toBeTruthy();
    expect(screen.getByText('사용자 스캔 · 검증 전')).toBeTruthy();
    expect(screen.queryByText('쿠팡검색')).toBeNull();
    expect(screen.queryByText(product.name)).toBeNull();
  });
});
