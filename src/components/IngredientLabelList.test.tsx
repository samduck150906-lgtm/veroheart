import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { IngredientLabelList } from './IngredientLabelList';
import { mapProductFromSupabaseRow } from '../lib/supabaseRowTypes';
import { ingredientLabelCounts } from '../utils/ingredientLabelCounts';
import { describeIngredientAvailability } from '../utils/productDataCompleteness';
afterEach(cleanup);
describe('라벨 원료·특성·점수 상태의 분리',()=>{
  it('영양 관계가 확인된 원료도 안전성 근거가 없으면 점수에서 제외하고 특성은 표시한다',()=>{
    const product=mapProductFromSupabaseRow({id:'reference-only',brand_name:'Fixture',name:'Fixture',product_type:'food',product_ingredient_label_sets:[{id:'label',is_current:true,product_ingredient_label_items:[
      {id:'rice-reference',display_order:1,raw_ingredient_text:'참고표 쌀',match_status:'matched',label_source_evidence:{verified:true,sourceUrl:'https://example.org',observedAt:'2026-11-09'},canonical_ingredients:{id:'reference-rice',canonical_name_ko:'참고표 쌀',status:'active',material_profile:[{constituentCode:'starch',constituentName:'전분',nutrientCode:'carbohydrate',nutrientName:'탄수화물',relation:'contains',sourceUrl:'https://example.org',sourceVersion:'fixture',amount:null,unit:null,basis:null}]}},
    ]}]});
    expect(product.ingredients).toHaveLength(0);
    expect(ingredientLabelCounts(product)).toEqual({declared:1,sourceConfirmed:1,traitsResolved:1});
    expect(describeIngredientAvailability(product).detail).toContain('특성 연결 1개');
    render(<IngredientLabelList product={product} onOpen={vi.fn()} />);
    expect(screen.getByText('원료 특성 · 탄수화물 공급원')).toBeTruthy();
    expect(screen.getByText(/참고표 쌀 → 전분 → 탄수화물/)).toBeTruthy();
    expect(screen.getByText(/점수 미반영 · 안전성 판정 근거 부족/)).toBeTruthy();
    expect(screen.queryByText('일반 원료')).toBeNull();
  });
  it('확인된 두 원료의 특성을 자식 정보로 표시하며 추가 원료로 세지 않는다',()=>{
    const rice={id:'rice',name_ko:'쌀',risk_level:'safe',description:'곡류',material_profile:[{constituentCode:'starch',constituentName:'전분',nutrientCode:'carbohydrate',nutrientName:'탄수화물',relation:'source_of' as const,sourceUrl:'https://example.org',sourceVersion:'fixture',amount:null,unit:null,basis:null}]};
    const product=mapProductFromSupabaseRow({id:'fixture',brand_name:'Fixture',name:'Fixture',product_type:'food',product_ingredient_label_sets:[{id:'label',is_current:true,product_ingredient_label_items:[
      {id:'rice-item',display_order:1,raw_ingredient_text:'쌀',match_status:'matched',label_source_evidence:{verified:true,sourceUrl:'https://example.org',observedAt:'2026-11-09'},ingredients:rice},
      {id:'unknown-item',display_order:2,raw_ingredient_text:'시험 미확인 원료',match_status:'unmatched',label_source_evidence:{verified:true,sourceUrl:'https://example.org',observedAt:'2026-11-09'}},
    ]}]});
    expect(ingredientLabelCounts(product)).toEqual({declared:2,sourceConfirmed:2,traitsResolved:1});
    expect(describeIngredientAvailability(product).label).toBe('확인된 원료 2개');
    render(<IngredientLabelList product={product} onOpen={vi.fn()} />);
    expect(screen.getByText('원료 특성 · 탄수화물 공급원')).toBeTruthy();
    const unknown=screen.getByText('시험 미확인 원료').parentElement!;
    expect(unknown.textContent).toContain('라벨 원문 대조됨');
    expect(unknown.textContent).toContain('특성 확인 중');
    expect(unknown.textContent).toContain('점수 미반영');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
