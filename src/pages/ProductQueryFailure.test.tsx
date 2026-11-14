import { cleanup, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import Detail from './Detail';
import AnalysisResult from './AnalysisResult';
import Home from './Home';
import Brand from './Brand';
import { getBrands, getProductsByBrand, getReviews } from '../lib/supabase';

vi.mock('../lib/productCategories', () => ({ useProductCategories: () => [] }));
vi.mock('../lib/supabase', async original => ({ ...await original<typeof import('../lib/supabase')>(),
  getReviews: vi.fn().mockResolvedValue([]), getBrands: vi.fn().mockResolvedValue([]),
  getProductsByBrand: vi.fn().mockRejectedValue(new Error('synthetic query failure')) }));
const initial = useStore.getState();
const error = '제품 정보를 불러오지 못했습니다. 제품 정보가 없는 것으로 판정하지 않았습니다.';
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  useStore.setState({ ...initial, isLoggedIn: false, userId: null, selectedProduct: null, products: [],
    isLoadingProducts: false, productDetailError: error, catalogError: error,
    fetchProductDetail: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { cleanup(); useStore.setState(initial); vi.restoreAllMocks(); });
const show = (path: string, route: string, element: React.ReactNode) => render(<HelmetProvider><MemoryRouter initialEntries={[path]}>
  <Routes><Route path={route} element={element} /></Routes>
</MemoryRouter></HelmetProvider>);
describe('product transport failure versus actual missing product', () => {
  it.each([
    [[{ averageRating: 5, reviewsCount: 1 },{ averageRating: 0, reviewsCount: 0 },{ averageRating: 0, reviewsCount: 0 }],'5.0'],
    [[{ averageRating: 5, reviewsCount: 1 },{ averageRating: 3, reviewsCount: 3 }],'3.5'],
    [[{ averageRating: 0, reviewsCount: 0 }],'-'],
  ])('brand averages only actual reviews (%j)', async (ratings,expected) => {
    const products = (ratings as Array<{averageRating:number;reviewsCount:number}>).map((rating,index) => ({id:`p${index}`,name:`제품 ${index}`,brand:'Fixture',category:'food',imageUrl:'',ingredients:[],...rating}));
    vi.mocked(getProductsByBrand).mockResolvedValueOnce(products);
    show('/brand/Fixture','/brand/:brandName',<Brand />);
    await screen.findByText('제품 0');
    expect(screen.getByText('평균 평점').nextElementSibling?.textContent).toBe(expected);
  });
  it('detail shows query failure, not product not found', () => {
    show('/product/fixture-product', '/product/:id', <Detail />);
    expect(screen.getByText('제품 조회에 실패했습니다')).toBeTruthy();
    expect(screen.queryByText('제품을 찾을 수 없습니다')).toBeNull();
  });
  it('analysis with a requested ID shows query failure, not an empty report', () => {
    show('/analysis?productId=fixture-product', '/analysis', <AnalysisResult />);
    expect(screen.getByText('제품 조회에 실패했습니다')).toBeTruthy();
    expect(screen.queryByText('분석할 제품이 없습니다')).toBeNull();
  });
  it('analysis without a requested ID still offers an honest empty state', () => {
    show('/analysis', '/analysis', <AnalysisResult />);
    expect(screen.getByText('분석할 제품이 없습니다')).toBeTruthy();
  });
  it('home exposes catalog failure without claiming insufficient nutrition', () => {
    show('/', '/', <Home />);
    expect(screen.getByRole('alert').textContent).toBe(error);
    expect(screen.queryByText(/영양정보 부족으로/)).toBeNull();
  });
  it('brand does not claim no registered products when its query failed', async () => {
    show('/brand/Fixture', '/brand/:brandName', <Brand />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('등록된 제품이 없습니다.')).toBeNull();
  });
  it('brand does not present partial success as a complete page when only the brand query fails', async () => {
    vi.mocked(getProductsByBrand).mockResolvedValueOnce([{ id:'fixture',name:'synthetic partial product',brand:'Fixture',category:'food',imageUrl:'',ingredients:[],reviewsCount:0,averageRating:0 }]);
    vi.mocked(getBrands).mockRejectedValueOnce(new Error('synthetic brand-list failure'));
    show('/brand/Fixture', '/brand/:brandName', <Brand />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('synthetic partial product')).toBeNull();
    expect(screen.getByText('총 리뷰 수').nextElementSibling?.textContent).toBe('—');
  });
  it('keeps loaded product evidence but marks an independently failed review request unavailable', async () => {
    vi.mocked(getReviews).mockRejectedValueOnce(new Error('synthetic review failure'));
    useStore.setState({ selectedProduct: { id:'fixture-product',name:'Synthetic product',brand:'Fixture',category:'food',imageUrl:'',ingredients:[],reviewsCount:0,averageRating:0 }, productDetailError:'' });
    show('/product/fixture-product','/product/:id',<Detail />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('아직 별점이 없습니다. 첫 별점을 남겨 주세요.')).toBeNull();
    expect(screen.queryByText('제품 조회에 실패했습니다')).toBeNull();
  });
});
