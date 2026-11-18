// Test-only entry. Actual Detail/Layout/CSS; no operating data or credentials.
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Product } from '../../src/types';
import '../../src/index.css';
import '../../src/styles/veroro-design.css';

const id = 'synthetic-layout-product';
const inset = new URLSearchParams(location.search).get('safeArea') === '34' ? 34 : 0;
document.documentElement.dataset.fixtureInset = String(inset);
document.documentElement.style.setProperty('--fixture-inset', `${inset}px`);
document.body.dataset.shareClicks = '0';
Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
  document.body.dataset.shareClicks = String(Number(document.body.dataset.shareClicks) + 1);
} });
// Installed before dynamically importing the SDK: only synthetic read responses.
globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : null;
  const url = new URL(request?.url ?? String(input), location.href);
  const method = init?.method ?? request?.method ?? 'GET';
  if (url.origin !== 'https://fixture.invalid' || method !== 'GET') throw new Error('Unexpected synthetic transport');
  const data = url.pathname === '/rest/v1/app_settings' ? []
    : url.pathname === '/rest/v1/product_ratings' ? Array.from({ length: 3 }, (_, n) => ({
      id: `synthetic-rating-${n}`, product_id: id, rating: 4, created_at: '2026-01-01T00:00:00Z', is_mine: false,
    })) : null;
  if (!data) throw new Error('Unexpected synthetic read');
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const [{ default: Detail }, { default: Layout }, { useStore }, { DEFAULT_USER_PET_PROFILE }] = await Promise.all([
  import('../../src/pages/Detail'), import('../../src/components/Layout'),
  import('../../src/store/useStore'), import('../../src/types'),
]);
const product: Product = { id, name: '합성 레이아웃 검증용 긴 제품명 용량과 포장 정보 보존', brand: '합성 브랜드',
  imageUrl: '', category: 'food', targetPetType: 'dog', analysisStatus: 'unavailable', ingredientDataLoaded: true,
  reviewsCount: 3, averageRating: 4, ingredients: Array.from({ length: 24 }, (_, n) => ({
    id: `synthetic-ingredient-${n}`, nameKo: `합성 원료 ${n + 1}`, nameEn: '', purpose: '합성 설명', riskLevel: 'safe',
  })) };
const evidenceScenario = new URLSearchParams(location.search).get('evidence');
if (evidenceScenario) {
  product.analysisStatus = 'ready';
  product.ingredientLabelSetId = 'synthetic-current-label';
  if (evidenceScenario === 'unverified') product.ingredientLabelEvidence = undefined;
  else if (['not_requested','unavailable','error'].includes(evidenceScenario)) {
    product.ingredientLabelEvidence = { lookup: { status: evidenceScenario as 'not_requested' | 'unavailable' | 'error' } };
  } else {
    const { publicLabelBinding } = await import('../../src/analysis/labelCompleteness');
    product.ingredientLabelEvidence = { lookup: { status: 'loaded', receipt: {
      productId: product.id, labelSetId: product.ingredientLabelSetId, revision: 'synthetic-server-revision',
      state: evidenceScenario as 'absent' | 'stale' | 'verified', binding: publicLabelBinding(product),
    } } };
  }
}
useStore.setState({ profile: DEFAULT_USER_PET_PROFILE, isLoggedIn: false, userId: null, pets: [],
  selectedProduct: product, products: [product], favorites: [], isLoadingProducts: false, productDetailError: '',
  fetchProductDetail: async () => {}, trackRecentView: async () => {},
});
createRoot(document.getElementById('root')!).render(<HelmetProvider><MemoryRouter initialEntries={['/search', `/product/${id}`]}>
  <Routes><Route element={<Layout />}>
    <Route path="/product/:id" element={<Detail />} />
    <Route path="/search" element={<h1>합성 이전 화면</h1>} />
    <Route path="/login" element={<h1>합성 로그인 화면</h1>} />
  </Route></Routes>
</MemoryRouter></HelmetProvider>);
