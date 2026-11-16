import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,within,act} from '@testing-library/react';
import ProductLabelSourceRegistration from './ProductLabelSourceRegistration';
const api=vi.hoisted(()=>({get:vi.fn(),save:vi.fn()}));
vi.mock('../../lib/adminApi',()=>({getLabelSourceWorkspace:api.get,registerIngredientLabelSource:api.save}));
const review={revision:'a'.repeat(64),eligible:false,snapshot:{product:['synthetic','합성 제품','합성 브랜드','옵션'],labels:[{id:'label',raw:'이전 원문',items:[{id:'old',raw:'이전 항목',match:'matched',order:1}]}]}};
const callbacks=()=>({onStart:vi.fn(),onChanged:vi.fn(),onUncertain:vi.fn()});
beforeEach(()=>{api.get.mockReset().mockResolvedValue({review,registration:null});api.save.mockReset().mockResolvedValue({status:'saved',workspace:{review,registration:null}});vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
async function fill(){fireEvent.click(screen.getByRole('button',{name:'원문 등록용 최신 자료 조회'}));await screen.findByText(/현재 제품:/);for(const [label,value] of [['전체 원재료·첨가물 원문','닭고기(육수, 간), 닭고기'],['원문 출처 (공개 HTTPS 또는 package:사진참조)','package:synthetic'],['실제 확인 시점 (시간대 포함, 예: 2026-11-16T10:00:00+09:00)','2026-01-01T00:00:00Z'],['제품·맛·중량·포장 수량·표시된 개정 대응 근거','합성 포장 근거'],['등록·교체 이유','원문 교체']])fireEvent.change(screen.getByLabelText(label),{target:{value}});fireEvent.click(screen.getByRole('button',{name:/원문에서 항목 초안 제안/}));}
it('explicit preview/save only; exact compound and repeated items, no approved/matched flags',async()=>{
 const c=callbacks();render(<ProductLabelSourceRegistration productId="synthetic" {...c}/>);await fill();expect(api.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'저장 전 변경 비교'}));const preview=screen.getByRole('region',{name:'저장 전 변경 비교'});expect(within(preview).getByText(/기존 1개 항목/)).toBeTruthy();fireEvent.click(within(preview).getByRole('button',{name:/새 원문 revision 저장/}));await screen.findByText(/새 라벨과 미검토 항목/);expect(api.save).toHaveBeenCalledTimes(1);expect(api.save.mock.calls[0][0]).toMatchObject({revision:review.revision,labelSetId:'label',payload:{rawText:'닭고기(육수, 간), 닭고기',stage:'draft',items:[{rawText:'닭고기(육수, 간)',section:'ingredients'},{rawText:'닭고기',section:'ingredients'}]}});expect(c.onStart).toHaveBeenCalledTimes(1);
});
it('uncertain/conflict blocks repost until fresh read; preserve draft for inspection',async()=>{
 api.save.mockRejectedValueOnce(Error('synthetic timeout'));render(<ProductLabelSourceRegistration productId="synthetic" {...callbacks()}/>);await fill();fireEvent.click(screen.getByRole('button',{name:'저장 전 변경 비교'}));fireEvent.click(screen.getByRole('button',{name:/새 원문 revision 저장/}));await screen.findByText(/충돌·실패 또는 저장 여부 미확인/);expect(screen.getByRole('group',{name:'제품·옵션과 원문 초안'})).toHaveProperty('disabled',true);expect(api.save).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'원문 등록용 최신 자료 조회'}));await screen.findByText(/현재 제품:/);expect(api.get).toHaveBeenCalledTimes(2);expect(screen.getByLabelText('전체 원재료·첨가물 원문')).toHaveProperty('value','');
});
it('unbalanced/unresolved segments require explicit hold and never certify coverage',async()=>{
 render(<ProductLabelSourceRegistration productId="synthetic" {...callbacks()}/>);await fill();fireEvent.change(screen.getByLabelText('전체 원재료·첨가물 원문'),{target:{value:'닭고기(미확인'}});expect(screen.getByRole('button',{name:'저장 전 변경 비교'})).toHaveProperty('disabled',true);fireEvent.click(screen.getByLabelText(/누락·해석 불가/));fireEvent.change(screen.getByLabelText('보류 사유'),{target:{value:'포장 훼손'}});expect(screen.getByRole('button',{name:'저장 전 변경 비교'})).toHaveProperty('disabled',false);expect(api.save).not.toHaveBeenCalled();
});
it('keyed product transition ignores previous in-flight response',async()=>{
 let done!:(r:unknown)=>void;api.get.mockReturnValueOnce(new Promise(r=>done=r));const c=callbacks();const v=render(<ProductLabelSourceRegistration key="one" productId="one" {...c}/>);fireEvent.click(screen.getByRole('button',{name:'원문 등록용 최신 자료 조회'}));v.rerender(<ProductLabelSourceRegistration key="two" productId="two" {...c}/>);await act(async()=>done({review,registration:null}));expect(screen.queryByText(/현재 제품:/)).toBeNull();expect(api.save).not.toHaveBeenCalled();
});

it('preview names removed tail items explicitly while retaining old history',async()=>{
 api.get.mockResolvedValueOnce({review:{...review,snapshot:{...review.snapshot,labels:[{...review.snapshot.labels[0],items:[...review.snapshot.labels[0].items,{id:'tail',raw:'이전 끝 항목',match:'matched',order:2},{id:'tail2',raw:'보존할 세 번째 항목',match:'matched',order:3}]}]}},registration:null});
 render(<ProductLabelSourceRegistration productId="synthetic" {...callbacks()}/>);await fill();fireEvent.click(screen.getByRole('button',{name:'저장 전 변경 비교'}));expect(screen.getByText(/이전: 보존할 세 번째 항목 → 새 초안에서 제거/)).toBeTruthy();expect(api.save).not.toHaveBeenCalled();
});

it('read failure is not treated as an empty label or a writable workspace',async()=>{
 api.get.mockRejectedValueOnce(Error('synthetic foundation missing'));render(<ProductLabelSourceRegistration productId="synthetic" {...callbacks()}/>);fireEvent.click(screen.getByRole('button',{name:'원문 등록용 최신 자료 조회'}));await screen.findByText(/원문 조회 실패 — 원문 없음으로 판단하지 않습니다/);expect(screen.queryByRole('group',{name:'제품·옵션과 원문 초안'})).toBeNull();expect(api.save).not.toHaveBeenCalled();
});
