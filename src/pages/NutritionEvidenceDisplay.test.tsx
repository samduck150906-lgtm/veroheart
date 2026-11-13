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
import { describeIngredientAvailability } from '../utils/productDataCompleteness';
import FeedAnalysisCard from '../components/FeedAnalysisCard';
import ProductCard from '../components/ProductCard';
import ProductRow from '../components/ProductRow';
import Detail from './Detail';
import Home from './Home';
import AnalysisResult from './AnalysisResult';

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
  it('distinguishes registered ingredients awaiting assessment from absent ingredients in analysis', () => {
    const pending = { ...product, analysisStatus: 'unavailable' as const, ingredientDataLoaded: true };
    useStore.setState({ selectedProduct: pending });
    show(<AnalysisResult />);
    expect(screen.getByText(describeIngredientAvailability(pending).detail)).toBeTruthy();
    expect(screen.queryByText('등록된 원료 정보가 없습니다')).toBeNull();
    expect(resolveProductDisplayVerdict(pending, profile).canShowScore).toBe(false);
    expect(screen.getByText(/종합 점수·등급과 건강 적합성을 판정할 수 없습니다/)).toBeTruthy();
  });
  it('only describes an actually loaded empty ingredient list as unregistered', () => {
    useStore.setState({ selectedProduct: { ...product, analysisStatus: 'unavailable', ingredientDataLoaded: true, ingredients: [] } });
    show(<AnalysisResult />);
    expect(screen.getByText('이 제품의 전성분 표기가 아직 등록되지 않았습니다.')).toBeTruthy();
    expect(screen.queryByText(/원료 분석이 완료/)).toBeNull();
  });
  it.each(['unavailable', 'ready'] as const)('does not treat unloaded ingredients as absent or fully assessed (stored: %s)', analysisStatus => {
    useStore.setState({ selectedProduct: { ...product, analysisStatus, ingredientDataLoaded: false,
      ingredients: analysisStatus === 'ready' ? product.ingredients : [] } });
    show(<AnalysisResult />);
    expect(screen.getByText('상세 화면에서 전성분 정보를 확인해 주세요.')).toBeTruthy();
    expect(screen.queryByText(/전성분 표기가 아직 등록되지|등록된 원료 정보가 없습니다|원료 분석이 완료되었습니다/)).toBeNull();
  });
  it.each([0, 1])('keeps unmatched/partially matched labels distinct from no label (known: %s)', known => {
    const pending = { ...product, analysisStatus: 'unavailable' as const, ingredientDataLoaded: true,
      ingredients: product.ingredients.slice(0, known), unknownIngredientTerms: ['합성 미검토 원료'] };
    useStore.setState({ selectedProduct: pending });
    show(<AnalysisResult />);
    expect(screen.getByText('확인되지 않은 원료가 있어 부분 분석만 제공합니다')).toBeTruthy();
    expect(screen.queryByText('등록된 원료 정보가 없습니다')).toBeNull();
    expect(resolveProductDisplayVerdict(pending, profile).canShowScore).toBe(false);
  });
  it.each([true, false])('retains a known conflicting label warning even with an incomplete projection (loaded: %s)', ingredientDataLoaded => {
    useStore.setState({ selectedProduct: { ...product, analysisStatus: 'blocked', ingredientDataLoaded } });
    show(<AnalysisResult />);
    expect(screen.getByText('원료 정보가 서로 달라 확인이 필요합니다')).toBeTruthy();
  });
  it('retains observed danger and allergy warnings while withholding an unavailable analysis', () => {
    useStore.setState({ profile: { ...profile, allergies: ['닭'] }, selectedProduct: { ...product,
      analysisStatus: 'unavailable', ingredients: [...product.ingredients,
        { id: 'synthetic-observed-risk', nameKo: '합성 위험 원료', nameEn: '', purpose: '', riskLevel: 'danger' }] } });
    show(<AnalysisResult />);
    expect(screen.getByText(/종합 점수·등급과 건강 적합성을 판정할 수 없습니다/)).toBeTruthy();
    expect(screen.getAllByText(/합성 위험 원료/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/알레르기|이\(가\) 들어 있습니다/).length).toBeGreaterThan(0);
  });
  it('shares the public display verdict while clearly withholding nutrition balance', () => {
    show(<FeedAnalysisCard product={product} profile={profile} />);
    const display=resolveProductDisplayVerdict(product,profile);
    expect(screen.getByTestId('feed-display-score').textContent).toBe(String(display.score));
    expect(screen.getByText(`원료 기준 참고 ${display.grade}등급`)).toBeTruthy();
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
  it.each([false, undefined])('does not treat veterinary flag %s as clinical clearance for feeding', async requiresVeterinaryGuidance => {
    useStore.setState({ selectedProduct: { ...product, requiresVeterinaryGuidance, caloriesPer100g: 100 } });
    render(<HelmetProvider><MemoryRouter initialEntries={['/product/synthetic-food']}>
      <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
    </MemoryRouter></HelmetProvider>);
    expect(await screen.findByText(/일반식 여부나 급여 안전성을 확인하지 않으며/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /열량 기준 참고 급여량/ })).toBeTruthy();
  });
  it('preserves veterinary guidance without requiring a source URL and explains why feeding is withheld', () => {
    useStore.setState({ selectedProduct: { ...product, requiresVeterinaryGuidance: true, caloriesPer100g: 100 } });
    render(<HelmetProvider><MemoryRouter initialEntries={['/product/synthetic-food']}>
      <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
    </MemoryRouter></HelmetProvider>);
    expect(screen.getAllByText(/수의사 상담이 필요한 제품/).length).toBeGreaterThan(0);
    expect(screen.getByText('이 제품의 일반 급여량 계산은 제공하지 않습니다.')).toBeTruthy();
    expect(screen.queryByText(/제품 열량 정보가 부족해 급여량/)).toBeNull();
  });
  it('guest analysis also uses assessed scope and warnings instead of the grade feeding slogan', () => {
    const full = { ...product, guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 } };
    useStore.setState({ selectedProduct: full, isLoggedIn: false, userId: null });
    show(<AnalysisResult />);
    expect(screen.queryByText(/믹스 없이 바로 급여 가능/)).toBeNull();
    expect(screen.getByText(/원료·기초 영양 참고 등급/)).toBeTruthy();
    expect(screen.getAllByText(/등록된 원료·기초 영양 지표 기준/).length).toBeGreaterThan(0);
  });
});
