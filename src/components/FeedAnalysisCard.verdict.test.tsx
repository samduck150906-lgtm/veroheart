import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it } from 'vitest';
import FeedAnalysisCard from './FeedAnalysisCard';
import { DEFAULT_USER_PET_PROFILE,type Product } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';

afterEach(cleanup);
const product:Product={id:'fixture',brand:'Fixture',name:'Fixture food',category:'food',targetPetType:'cat',imageUrl:'',reviewsCount:0,averageRating:0,analysisStatus:'ready',
  ingredients:[{id:'chicken',nameKo:'닭고기',nameEn:'Chicken',purpose:'단백질',riskLevel:'safe'}],
  guaranteedAnalysis:{crudeProtein:19,crudeFat:12,crudeFiber:2.8,crudeAsh:7.4,moisture:10.5}};
describe('상세·리포트 공통 점수와 영양 표시',()=>{
  it.each([DEFAULT_USER_PET_PROFILE,{...DEFAULT_USER_PET_PROFILE,id:'owned-pet',name:'Fixture pet',species:'Dog' as const,allergies:['닭']}])('동일한 프로필의 공통 판정 점수·등급을 사용한다',profile=>{
    const display=resolveProductDisplayVerdict(product,profile);
    render(<FeedAnalysisCard product={product} profile={profile} />);
    expect(screen.getByTestId('feed-display-score').textContent).toBe(String(display.score));
    expect(screen.getByText(`${display.nutrition.scopeLabel} ${display.grade}등급`)).toBeTruthy();
    expect(screen.getByText('2.8%')).toBeTruthy();
    expect(screen.getByText('7.4%')).toBeTruthy();
    expect(screen.getByText(/kcal\/100g \(추정값\)/)).toBeTruthy();
  });
  it('원료 projection을 불러오지 않았으면 저장된 ready만으로 점수를 표시하지 않는다',()=>{
    render(<FeedAnalysisCard product={{...product,ingredientDataLoaded:false}} profile={DEFAULT_USER_PET_PROFILE} />);
    expect(screen.getByTestId('feed-display-score').textContent).toBe('—');
  });
});
