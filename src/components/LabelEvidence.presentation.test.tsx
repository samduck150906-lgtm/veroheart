import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import { useStore } from '../store/useStore';
import { LABEL_COMPARISON_NOTICE } from '../analysis/labelCompleteness';
import ProductCard from './ProductCard';
import ProductRow from './ProductRow';
import FeedAnalysisCard from './FeedAnalysisCard';

const profile = { ...DEFAULT_USER_PET_PROFILE, id: 'synthetic-owned-pet', allergies: ['닭'] };
const product: Product = { id: 'synthetic-unverified', name: '합성 미대조 사료', brand: '합성',
  category: 'food', targetPetType: 'cat', imageUrl: '', reviewsCount: 0, averageRating: 0,
  analysisStatus: 'ready', requiresVeterinaryGuidance: true,
  ingredients: [{ id: 'synthetic-chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'danger' }] };
const initial = useStore.getState();
afterEach(() => { cleanup(); useStore.setState(initial); });

describe('withheld full-label assessment retains confirmed warnings', () => {
  it.each(['row', 'card', 'grid'] as const)('shows known warnings without a full score in %s', surface => {
    useStore.setState({ isLoggedIn: true, profile, favorites: [] });
    render(<MemoryRouter>{surface === 'row' ? <ProductRow product={product} /> : <ProductCard product={product} grid={surface === 'grid'} />}</MemoryRouter>);
    expect(screen.queryByText(/참고.*\d+점/)).toBeNull();
    expect(screen.getAllByText(/다른 동물 종류 전용 제품/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/알레르기·회피 성분 1개 확인/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/위험 성분 1개 확인/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/수의사 상담 필요/).length).toBeGreaterThan(0);
  });
  it('keeps feed cautions alongside a whole-label limitation rather than an A grade', () => {
    render(<FeedAnalysisCard product={product} profile={profile} />);
    expect(screen.getAllByText(LABEL_COMPARISON_NOTICE).length).toBeGreaterThan(0);
    expect(screen.queryByText(/참고 A등급/)).toBeNull();
    expect(screen.getByText('분석 보류')).toBeTruthy();
    expect(screen.getAllByText(/위험|알레르기|동물 종류/).length).toBeGreaterThan(0);
  });
});
