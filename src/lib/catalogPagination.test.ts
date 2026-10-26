import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>mocks}));
beforeEach(()=>{vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','https://test.supabase.co');vi.stubEnv('VITE_SUPABASE_ANON_KEY','anon');mocks.rpc.mockReset();mocks.from.mockReset();});
function rows(ids:string[]){
  const result={data:ids.map(id=>({id,name:id,brand_name:'브랜드',product_type:'food'})),error:null};
  const chain:Record<string,unknown>={then:(resolve:(v:unknown)=>void)=>Promise.resolve(result).then(resolve)};
  for(const key of ['select','eq','in','order','limit','range','overlaps'])chain[key]=()=>chain;
  mocks.from.mockReturnValue(chain);
}
describe('catalog pagination',()=>{
  it('shows the catalog on an empty query and returns the next raw-result offset',async()=>{
    const {searchProductsPage}=await import('./supabase');
    mocks.rpc.mockResolvedValue({data:Array.from({length:100},(_,i)=>({product_id:`p${i}`,rank:1})),error:null});rows(['p0']);
    const result=await searchProductsPage('',undefined,[],{},0);
    expect(result.products.map(p=>p.id)).toEqual(['p0']);
    expect(result.nextOffset).toBe(100);
    expect(mocks.rpc).toHaveBeenCalledWith('search_catalog_products',expect.objectContaining({p_query:'',p_offset:0}));
  });
  it('can reach matches beyond the first 100 without repeating the first page',async()=>{
    const {searchProductsPage}=await import('./supabase');
    mocks.rpc.mockResolvedValue({data:[{product_id:'p101',rank:1}],error:null});rows(['p101']);
    const result=await searchProductsPage('로얄캐닌',undefined,[],{},100);
    expect(result.products.map(p=>p.id)).toEqual(['p101']);expect(result.nextOffset).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('search_catalog_products',expect.objectContaining({p_offset:100}));
  });
  it('continues past an empty filtered page to return an actual match',async()=>{
    const {searchProductsPage}=await import('./supabase');
    mocks.rpc.mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({product_id:`p${i}`,rank:1})),error:null})
      .mockImplementationOnce(async()=>{rows(['p101']);return {data:[{product_id:'p101',rank:1}],error:null};});rows([]);
    const result=await searchProductsPage('사료',undefined,[],{brand:'브랜드'},0);
    expect(result.products.map(p=>p.id)).toEqual(['p101']);
    expect(result.nextOffset).toBeNull();
  });
});
