import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProductLabelReview from './ProductLabelReview';
const api=vi.hoisted(()=>({get:vi.fn(),approve:vi.fn()}));
vi.mock('../../lib/adminApi',()=>({getIngredientLabelReview:api.get,approveIngredientLabelReview:api.approve}));
beforeEach(()=>{api.get.mockReset().mockResolvedValue({revision:'synthetic-revision',eligible:true,snapshot:{product:['synthetic','합성 제품','합성 브랜드'],labels:[{id:'synthetic-label',raw:'닭고기',source:'fixture:source',items:[{id:'synthetic-item',order:1,raw:'닭고기',match:'matched'}]}]}});api.approve.mockReset().mockResolvedValue({result:{status:'approved'}});});
afterEach(cleanup);
it('requires a new explicit whole-source review, never approval on opening or cancel',async()=>{
 render(<ProductLabelReview productId="synthetic-product"/>);
 expect(api.get).not.toHaveBeenCalled();expect(api.approve).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'저장된 라벨 전체 대조 자료 조회'}));
 const approve=await screen.findByRole('button',{name:'전체 대조 승인 기록'});expect(approve).toHaveProperty('disabled',true);
 fireEvent.click(screen.getByRole('button',{name:'검토 취소'}));expect(api.approve).not.toHaveBeenCalled();
});
it('uses the existing admin API only after item/source/package/whole-label confirmations',async()=>{
 render(<ProductLabelReview productId="synthetic-product"/>);
 fireEvent.click(screen.getByRole('button',{name:'저장된 라벨 전체 대조 자료 조회'}));await screen.findByText('닭고기');
 for(const label of ['닭고기 (matched)','이 제품·포장과 원본의 대응을 직접 확인했습니다.','원본 전체를 대조했고 누락·미확인 항목이 없습니다.']) fireEvent.click(screen.getByLabelText(label));
 for(const [label,value] of [['이번에 직접 확인한 원본 이미지·공식 자료 참조','fixture:new-source'],['맛·용량·포장·개정 대응 근거','합성 포장 대조'],['원문 전체 대조·누락 여부 확인 기록','전체 확인']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'전체 대조 승인 기록'}));
 await screen.findByText('전체 대조 증거와 감사 기록을 저장했습니다.');
 expect(api.approve).toHaveBeenCalledTimes(1);expect(api.approve.mock.calls[0][0]).toMatchObject({productId:'synthetic-product',revision:'synthetic-revision',reviewedItemIds:['synthetic-item'],identityConfirmed:true,wholeLabelCompared:true});
});

it('distinguishes no captured current label from an unperformed evidence lookup',async()=>{
 api.get.mockResolvedValueOnce({revision:'synthetic',eligible:false,snapshot:{product:['synthetic'],labels:[]}});
 render(<ProductLabelReview productId="synthetic-product"/>);fireEvent.click(screen.getByRole('button',{name:'저장된 라벨 전체 대조 자료 조회'}));
 expect(await screen.findByText(/저장된 현재 라벨이 없습니다/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'전체 대조 승인 기록'})).toBeNull();expect(api.approve).not.toHaveBeenCalled();
});

it('switching products discards old review and ignores an old in-flight response',async()=>{
 let finish!: (value: unknown) => void;api.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(<ProductLabelReview productId="first-synthetic"/>);fireEvent.click(screen.getByRole('button',{name:'저장된 라벨 전체 대조 자료 조회'}));
 view.rerender(<ProductLabelReview productId="second-synthetic"/>);
 await act(async()=>{finish({revision:'old',eligible:true,snapshot:{product:['first','OLD PRODUCT'],labels:[{id:'old',raw:'OLD RAW',items:[]}]}});});
 expect(screen.queryByText('OLD RAW')).toBeNull();expect(screen.queryByRole('button',{name:'전체 대조 승인 기록'})).toBeNull();
 expect(screen.getByRole('button',{name:'저장된 라벨 전체 대조 자료 조회'})).toHaveProperty('disabled',false);expect(api.approve).not.toHaveBeenCalled();
});
