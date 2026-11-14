import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
const h=vi.hoisted(()=>({fetch:vi.fn(),save:vi.fn(),status:vi.fn()}));
vi.mock('../../lib/adminApi',()=>({fetchEnrichmentQueue:h.fetch,saveProductSource:h.save,updateEnrichmentStatus:h.status}));
vi.mock('./AdminProductCleanup',()=>({default:()=>null}));
vi.mock('./AdminProductFacts',()=>({default:()=>null}));
import AdminDataQuality from './AdminDataQuality';
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('catalog archive scope',()=>{
 it('retains original missing fields and reason in a read-only archive view',async()=>{
  h.fetch.mockResolvedValue({total:973,rows:[{product_id:'archive',status:'blocked',missing_fields:['ingredients','nutrition','barcode'],review_note:'가상 상품 생성 배치와 일치',reviewed_at:null,updated_at:'2026-11-13T00:00:00Z',source_count:0,products:{id:'archive',name:'원본 가상 기록',brand_name:'원본 브랜드',target_pet_type:'dog',main_category:null,image_url:null,barcode:null,is_visible:false,verification_status:'pending',catalog_archived_at:'2026-11-13T00:00:00Z',catalog_archive_reason:'사용자 승인: 가상 기록 원본 보관'}}]});
  render(<MemoryRouter initialEntries={['/?catalog=archived&visibility=all']}><AdminDataQuality/></MemoryRouter>);
  await screen.findByRole('button',{name:'보관 사유 보기'});
  expect(h.fetch).toHaveBeenCalledWith(expect.objectContaining({catalogScope:'archived',visibility:'all'}));
  fireEvent.click(screen.getByRole('button',{name:'보관 사유 보기'}));
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).getByText('원본 보관 · 보완 완료 아님')).toBeTruthy();
  expect(within(dialog).getByText(/ingredients, nutrition, barcode/)).toBeTruthy();
  expect(within(dialog).queryByRole('button',{name:'출처 저장'})).toBeNull();
  expect(within(dialog).queryByRole('link',{name:/제품 편집/})).toBeNull();
  expect(h.save).not.toHaveBeenCalled();expect(h.status).not.toHaveBeenCalled();
 });
 it('lets operators inspect the combined original cohort without marking archived gaps complete',async()=>{
  h.fetch.mockResolvedValue({total:0,rows:[]});
  render(<MemoryRouter><AdminDataQuality/></MemoryRouter>);
  await waitFor(()=>expect(h.fetch).toHaveBeenCalledWith(expect.objectContaining({catalogScope:'active'})));
  fireEvent.change(screen.getByRole('combobox',{name:'원본 보관 범위'}),{target:{value:'all'}});
  await waitFor(()=>expect(h.fetch).toHaveBeenCalledWith(expect.objectContaining({catalogScope:'all'})));
 });
});
