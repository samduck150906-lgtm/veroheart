import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ fetchDiaryPage: vi.fn(), correct: vi.fn() }));
vi.mock('../../lib/adminSupportApi', () => ({correctFeedingLog:h.correct}));
vi.mock('../../lib/adminApi', () => ({ fetchDiaryPage: h.fetchDiaryPage }));

import AdminDiary from './AdminDiary';

describe('AdminDiary', () => {
  beforeEach(() => {
    h.fetchDiaryPage.mockReset().mockResolvedValue({
      total: 1,
      rows: [{
        id: '1',
        feedingDate: '2026-09-10',
        feedingTime: '08:30:00',
        memberNickname: '보리보호자',
        petName: '보리',
        petType: 'dog',
        productName: '오리젠',
        amount: 80,
        unit: 'g',
        preferenceLevel: 5,
        imageUrl: null,
        memo: '잘 먹음',
        createdAt: '2026-09-10T00:00:00Z',
      }],
    });
  });

  afterEach(() => cleanup());

  it('실제 다이어리 행을 페이지 단위로 보여준다', async () => {
    render(<MemoryRouter><AdminDiary /></MemoryRouter>);
    expect(await screen.findByText('보리보호자')).toBeTruthy();
    expect(screen.getByText('오리젠')).toBeTruthy();
    expect(h.fetchDiaryPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it('동물종·사진 필터를 서버 요청에 반영한다', async () => {
    render(<MemoryRouter><AdminDiary /></MemoryRouter>);
    await screen.findByText('보리보호자');
    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByLabelText('사진'), { target: { value: 'yes' } });
    await waitFor(() => {
      expect(h.fetchDiaryPage).toHaveBeenLastCalledWith(expect.objectContaining({ petType: 'cat', hasPhoto: true }));
    });
  });
});

describe('member support',()=>{
 beforeEach(()=>h.fetchDiaryPage.mockResolvedValue({total:1,rows:[{id:'1',feedingDate:'2026-11-04',feedingTime:null,mealPeriod:null,memberNickname:'보리보호자',petName:'보리',petType:'dog',productName:'사료',amount:80,unit:'g',preferenceLevel:null,memo:null,reactionNote:null,createdAt:'2026-11-04'}]}));
 afterEach(cleanup);
 it('scopes support history to the member and saves a decimal correction with original values',async()=>{
 h.correct.mockResolvedValue({ok:true});
 render(<MemoryRouter initialEntries={['/admin/diary?userId=member']}><AdminDiary/></MemoryRouter>);
 await screen.findByText('보리보호자'); expect(h.fetchDiaryPage).toHaveBeenCalledWith(expect.objectContaining({userId:'member'}));
 fireEvent.click(screen.getByRole('button',{name:'보리 급여 기록 정정'}));
 fireEvent.change(screen.getByLabelText('급여량'),{target:{value:'80.5'}});
 fireEvent.change(screen.getByLabelText('처리 사유 (필수)'),{target:{value:'보호자 급여량 정정 요청'}});
 fireEvent.click(screen.getByRole('button',{name:'정정 저장'}));
 await waitFor(()=>expect(h.correct).toHaveBeenCalledWith('1',expect.objectContaining({amount:80.5}),expect.objectContaining({amount:80}),'보호자 급여량 정정 요청'));
});
});
