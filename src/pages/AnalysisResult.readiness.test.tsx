import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import AnalysisResult from './AnalysisResult';

const base: Product = { id:'food-1', name:'라벨 사료', brand:'브랜드', category:'food', targetPetType:'dog', imageUrl:'', reviewsCount:0, averageRating:0, ingredients:[{id:'chicken',nameKo:'닭고기',nameEn:'chicken',purpose:'',riskLevel:'safe'}], analysisStatus:'ready' };
function Location() { const location = useLocation(); return <div data-testid="analysis-location">{location.search}</div>; }
function show(product: Product | null, url = '/analysis') {
  useStore.setState({ selectedProduct:product });
  return render(<MemoryRouter initialEntries={[url]}><AnalysisResult /><Location /></MemoryRouter>);
}
beforeEach(() => {
  useStore.setState({ products:[], selectedProduct:null, isLoggedIn:true, isLoadingProducts:false, fetchProductDetail:vi.fn().mockResolvedValue(undefined), profile:{...DEFAULT_USER_PET_PROFILE,id:'pet-1',name:'로니',healthConcerns:['신장'],allergies:[]} });
});
afterEach(cleanup);

describe('analysis result evidence boundary', () => {
  it.each(['partial','unavailable','blocked'] as const)('hides score, grade and positive/disease claims for %s ingredient evidence', (analysisStatus) => {
    show({...base,analysisStatus,unknownIngredientTerms:['새 원료'],guaranteedAnalysis:{crudeProtein:30,crudeFat:15,crudeFiber:3,crudeAsh:8,moisture:10}});
    expect(screen.queryByText(/^\d+점$/)).toBeNull();
    expect(screen.queryByText('원료 품질 근거')).toBeNull();
    expect(screen.queryByText('좋은 점')).toBeNull();
    expect(screen.queryByText(/건강 고민 맞춤 분석/)).toBeNull();
    expect(screen.queryByText(/주의·위험 항목은 확인되지/)).toBeNull();
  });
  it('does not invent wet-food nutrition or calories when no values are reported', () => {
    show({...base,name:'습식 캔 사료',category:'습식'});
    fireEvent.click(screen.getByRole('button',{name:'영양소'}));
    expect(screen.queryByText('형태 기반 추정')).toBeNull();
    expect(screen.queryByText('95')).toBeNull();
    expect(screen.queryByText('kcal / 100g')).toBeNull();
    expect(screen.getByText(/영양 수치가 등록되지/)).toBeTruthy();
  });
  it('keeps explicit label calories even without a full nutrient panel', () => {
    show({...base,caloriesPer100g:123});
    fireEvent.click(screen.getByRole('button',{name:'영양소'}));
    expect(screen.getByText('123')).toBeTruthy();
    expect(screen.getByText('라벨에 표시된 열량이에요')).toBeTruthy();
    expect(screen.queryByText('390')).toBeNull();
  });
  it('does not invent missing macros or energy from a partial panel', () => {
    show({...base,guaranteedAnalysis:{crudeProtein:30,crudeFat:15}});
    fireEvent.click(screen.getByRole('button',{name:'영양소'}));
    expect(screen.queryByText('kcal / 100g')).toBeNull();
    expect(screen.queryByText('탄수화물')).toBeNull();
    expect(screen.getByText('30%')).toBeTruthy();
  });
  it('labels calculated calories as an estimate when the complete panel exists', () => {
    show({...base,guaranteedAnalysis:{crudeProtein:30,crudeFat:15,crudeFiber:3,crudeAsh:8,moisture:10}});
    fireEvent.click(screen.getByRole('button',{name:'영양소'}));
    expect(screen.getByText('보장성분으로 계산한 추정 열량이에요')).toBeTruthy();
    expect(screen.queryByText('라벨에 표시된 열량이에요')).toBeNull();
  });
  it('does not analyze an arbitrary first catalog product without a selection', () => {
    useStore.setState({products:[base]});
    show(null);
    expect(screen.getByText('분석할 제품이 없어요')).toBeTruthy();
    expect(screen.queryByText(base.name)).toBeNull();
  });
  it('does not substitute a stale selected product for an explicit different ID', () => {
    show(base,'/analysis?productId=missing-food');
    expect(screen.queryByText(base.name)).toBeNull();
    expect(useStore.getState().fetchProductDetail).toHaveBeenCalledWith('missing-food');
  });
  it('persists a selected product ID in the route for reloads', () => {
    show(base);
    expect(screen.getByTestId('analysis-location').textContent).toBe('?productId=food-1');
  });
  it('retains a score for complete ingredient evidence', () => {
    show(base);
    expect(screen.getByText(/^\d+점$/)).toBeTruthy();
    expect(screen.getByText('원료 품질 근거')).toBeTruthy();
  });
  it('preserves known zero nutrition but suppresses disease advice without a full panel', () => {
    show({...base,guaranteedAnalysis:{crudeProtein:30,crudeFat:0}});
    expect(screen.queryByText(/건강 고민 맞춤 분석/)).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'영양소'}));
    expect(screen.getByText('0%')).toBeTruthy();
  });
  it('shows unresolved label terms without safe claims on the ingredient tab', () => {
    show({...base,analysisStatus:'partial',unknownIngredientTerms:['미확인 혼합물']});
    fireEvent.click(screen.getByRole('button',{name:'전성분'}));
    expect(screen.getByText('미확인 혼합물 · 원료 확인 필요')).toBeTruthy();
    expect(screen.queryByText('안전')).toBeNull();
    expect(screen.getByText('확인된 원료')).toBeTruthy();
  });
  it('can load the selected product directly from a durable query route', () => {
    show(null,'/analysis?productId=food-1');
    expect(useStore.getState().fetchProductDetail).toHaveBeenCalledWith('food-1');
  });
});
