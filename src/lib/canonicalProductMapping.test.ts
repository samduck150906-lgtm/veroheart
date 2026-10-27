import { describe, expect, it } from 'vitest';
import { mapProductFromSupabaseRow, type SupabaseProductRow } from './supabaseRowTypes';
import { analyzeFeed } from '../analysis/feedAnalysis';
const base: SupabaseProductRow = { id:'p',name:'사료',brand_name:'브랜드',product_type:'food' };
const chicken = { id:'chicken',name_ko:'닭고기',name_en:'Chicken',risk_level:'safe' };
describe('current label runtime mapping', () => {
  it('does not promote the second matched ingredient when the first is unresolved', () => {
    const product = mapProductFromSupabaseRow({ ...base, analysis_status: 'ready', product_ingredient_label_sets: [{ id: 'label', is_current: true, product_ingredient_label_items: [
      { display_order: 1, raw_ingredient_text: '미확인 첫 원료', match_status: 'unmatched' },
      { display_order: 2, raw_ingredient_text: '닭고기', match_status: 'matched', ingredients: chicken },
    ] }] });
    const result = analyzeFeed(product, { id:'pet',name:'반려견',species:'Dog',age:4,allergies:[],healthConcerns:[] });
    expect(result.ingredientQuality.firstIngredient).toBeNull();
    expect(result.ingredientQuality.firstIsAnimalProtein).toBe(false);
    expect(result.positives.some(text => text.includes('제1원료'))).toBe(false);
  });
  it('orders legacy ingredients by the label position rather than response order', () => {
    const row = { ...base, product_ingredients:[{sort_order:2,ingredients:{...chicken,id:'wheat',name_ko:'밀'}},{sort_order:1,ingredients:chicken}] };
    expect(mapProductFromSupabaseRow(row).ingredients.map(i=>i.nameKo)).toEqual(['닭고기','밀']);
  });
  it('uses current canonical label ingredients instead of a stale legacy list', () => {
    const row = { ...base, analysis_status:'ready',product_ingredients:[{ingredients:{...chicken,id:'old',name_ko:'이전 원료'}}],product_ingredient_label_sets:[{id:'label',is_current:true,product_ingredient_label_items:[{display_order:0,raw_ingredient_text:'신선한 닭고기',match_status:'matched' as const,canonical_ingredients:{id:'canonical-chicken',canonical_name_ko:'닭고기',status:'active',ingredients:chicken}}]}] };
    const product = mapProductFromSupabaseRow(row);
    expect(product.ingredients).toHaveLength(1);
    expect(product.ingredients[0]).toMatchObject({nameKo:'닭고기',canonicalIngredientId:'canonical-chicken',rawLabelText:'신선한 닭고기'});
    expect(product.analysisStatus).toBe('ready');
  });
  it('keeps a matched row without usable risk evidence unresolved instead of safe', () => {
    const row = { ...base,analysis_status:'ready',product_ingredient_label_sets:[{id:'label',is_current:true,product_ingredient_label_items:[{display_order:0,raw_ingredient_text:'새로운 원료',match_status:'matched' as const}]}] };
    const product = mapProductFromSupabaseRow(row);
    expect(product.ingredients).toEqual([]);
    expect(product.unknownIngredientTerms).toEqual(['새로운 원료']);
    expect(analyzeFeed(product,{id:'pet',name:'반려견',species:'Dog',age:4,allergies:[],healthConcerns:[]}).analysisReadiness.status).toBe('partial');
  });
});
