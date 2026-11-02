import { cleanup, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import { useStore } from '../store/useStore';
import { NUTRITION_INSUFFICIENT_NOTICE } from '../analysis/nutritionReadiness';
import { generateAnalysisReport } from '../utils/analysis';
import { buildProductConclusion } from '../utils/productConclusion';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import FeedAnalysisCard from '../components/FeedAnalysisCard';
import ProductCard from '../components/ProductCard';
import ProductRow from '../components/ProductRow';
import Detail from './Detail';
import Home from './Home';
import AnalysisResult from './AnalysisResult';
import Comparison from './Comparison';

const api = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../lib/supabase', async original => ({ ...await original<typeof import('../lib/supabase')>(),
  getReviews: vi.fn().mockResolvedValue([]), searchProductsPage: api.search }));
vi.mock('../lib/productCategories', () => ({ useProductCategories: () => [] }));
const profile = { ...DEFAULT_USER_PET_PROFILE, id: 'synthetic-pet', name: '합성 반려동물', allergies: [], healthConcerns: [] };
const product: Product = { id: 'synthetic-food', name: '합성 사료', brand: '합성 브랜드', category: 'food',
  targetPetType: 'dog', imageUrl: 'https://fixture.invalid/food.png', reviewsCount: 0, averageRating: 0,
  analysisStatus: 'ready', ingredients: ['닭고기', '연어', '타우린', '유산균', '글루코사민'].map(nameKo => ({
    id: nameKo, nameKo, nameEn: '', purpose: '', riskLevel: 'safe',
  })) };
const initial = useStore.getState();
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  api.search.mockReset().mockResolvedValue({ products: [product], nextOffset: null });
  useStore.setState({ ...initial, isLoggedIn: true, userId: 'synthetic-owner', profile, pets: [profile],
    products: [], recentViews: [], selectedProduct: product, favorites: [], isLoadingProducts: false,
    fetchProductDetail: vi.fn().mockResolvedValue(undefined), trackRecentView: vi.fn() });
});
afterEach(() => { cleanup(); useStore.setState(initial); vi.restoreAllMocks(); });
const show = (element: React.ReactNode) => render(<HelmetProvider><MemoryRouter>{element}</MemoryRouter></HelmetProvider>);

describe('nutrition evidence on shared public display paths (synthetic data, no API)', () => {
  it('keeps 82/A but scopes the feed card and clearly withholds nutrition balance', () => {
    show(<FeedAnalysisCard product={product} profile={profile} />);
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText('원료 기준 참고 A등급')).toBeTruthy();
    expect(screen.getByText('영양 균형 미평가')).toBeTruthy();
    expect(screen.getAllByText(NUTRITION_INSUFFICIENT_NOTICE)).toHaveLength(1);
    expect(screen.queryByText(/균형 잡힌|매우 우수|무난하게 급여/)).toBeNull();
  });
  it.each([false, true])('qualifies search/catalog cards (grid: %s) without hiding the score', grid => {
    show(<ProductCard product={product} grid={grid} />);
    const score = resolveProductDisplayVerdict(product, profile).score;
    expect(screen.getByText(`원료 기준 참고 ${score}점`)).toBeTruthy();
    expect(screen.getByText(NUTRITION_INSUFFICIENT_NOTICE)).toBeTruthy();
  });
  it('replaces an unqualified search-row fit claim with scope and the same notice', () => {
    show(<ProductRow product={product} />);
    expect(screen.getByText(NUTRITION_INSUFFICIENT_NOTICE)).toBeTruthy();
    expect(screen.queryByText(/에게 딱|무난해/)).toBeNull();
  });
  it('renders the same notice in detail and the analysis report without a global-fit percentage', async () => {
    render(<HelmetProvider><MemoryRouter initialEntries={['/product/synthetic-food']}>
      <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
    </MemoryRouter></HelmetProvider>);
    const region = await screen.findByRole('region', { name: '합성 반려동물 참고 평가' });
    expect(within(region).queryByText(/^\d+%$/)).toBeNull();
    expect(screen.getAllByText(NUTRITION_INSUFFICIENT_NOTICE, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/균형 잡힌/)).toBeNull();
    cleanup();
    show(<AnalysisResult />);
    expect(screen.getByText(/원료 기준 참고 등급/)).toBeTruthy();
    expect(screen.getAllByText(new RegExp('영양정보 부족으로 영양 균형')).length).toBeGreaterThan(0);
  });
  it('keeps the recommendation score and exposes its evidence scope and notice', async () => {
    show(<Home />);
    const section = screen.getByRole('region', { name: '합성 반려동물 기준 참고 제품' });
    await within(section).findByText(NUTRITION_INSUFFICIENT_NOTICE);
    expect(within(section).getByText(/원료 기준 참고/)).toBeTruthy();
    expect(api.search).toHaveBeenCalled();
  });
  it('preserves risk and allergy warnings in report text alongside the limitation', () => {
    const allergy = generateAnalysisReport(product, { ...profile, allergies: ['닭'] });
    expect(allergy.summary).toMatch(/급여를 권하지 않습니다.*영양정보 부족/);
    const risk = generateAnalysisReport({ ...product, ingredients: [...product.ingredients,
      { id: 'synthetic-risk', nameKo: '합성 위험 원료', nameEn: '', purpose: '', riskLevel: 'danger' }] }, profile);
    expect(risk.summary).toMatch(/위험 성분.*영양정보 부족/);
    expect(risk.highlights.some(h => h.text.includes('위험 성분'))).toBe(true);
    const conclusion = buildProductConclusion({ ...product, ingredients: [
      { id: 'synthetic-risk', nameKo: '합성 위험 원료', nameEn: '', purpose: '', riskLevel: 'danger' },
    ] }, profile, risk);
    expect(conclusion.tone).toBe('alert');
    expect(conclusion.headline).toContain('위험 등급');
    expect(conclusion.subline).toContain(NUTRITION_INSUFFICIENT_NOTICE);
  });
  it('describes a comparison tie as a score comparison, never feeding suitability', () => {
    const other = { ...product, id: 'synthetic-other', name: '두번째 합성 사료' };
    useStore.setState({ products: [product, other], comparisonList: [product.id, other.id] });
    show(<Comparison />);
    expect(screen.getByText('두 제품 모두 참고 점수 차이가 없습니다')).toBeTruthy();
    expect(screen.queryByText(/비슷하게 잘 맞|선택해도 괜찮/)).toBeNull();
    expect(screen.getAllByText(new RegExp('영양정보 부족으로 영양 균형')).length).toBeGreaterThan(0);
  });
  it('keeps complete basic nutrition scoped without an immediate-feeding promise', async () => {
    const full = { ...product, guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 } };
    useStore.setState({ selectedProduct: full });
    render(<HelmetProvider><MemoryRouter initialEntries={['/product/synthetic-food']}>
      <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
    </MemoryRouter></HelmetProvider>);
    const region = await screen.findByRole('region', { name: '합성 반려동물 참고 평가' });
    expect(within(region).queryByText(/^\d+%$/)).toBeNull();
    expect(screen.getAllByText(/원료·기초 영양 참고/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/완전한 영양 적합성을 보장하지 않습니다/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/믹스 없이 바로 급여 가능|영양정보 부족으로/)).toBeNull();
    cleanup();
    show(<ProductRow product={full} />);
    expect(screen.queryByText(/에게 딱|무난합니다/)).toBeNull();
    expect(screen.getByText(`원료·기초 영양 참고 ${resolveProductDisplayVerdict(full, profile).score}점`)).toBeTruthy();
  });
});
