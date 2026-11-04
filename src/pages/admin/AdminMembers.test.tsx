import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ fetchMembers: vi.fn(), fetchMemberDetail: vi.fn(), activity: vi.fn(), correct: vi.fn() }));

vi.mock('../../lib/adminApi', () => ({
  fetchMembers: h.fetchMembers,
  fetchMemberDetail: h.fetchMemberDetail,
}));

vi.mock('../../lib/adminSupportApi',()=>({fetchMemberActivity:h.activity,correctPet:h.correct}));
import AdminMembers from './AdminMembers';

describe('AdminMembers', () => {
  beforeEach(() => {
    h.fetchMembers.mockReset().mockResolvedValue({
      total: 1,
      rows: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'old-member@example.com',
          loginId: 'old-member@example.com',
          loginIdKind: 'email',
          nickname: 'old-member',
          provider: 'email',
          profileMissing: true,
          emailConfirmed: true,
          lastSignInAt: '2026-09-09T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
          petCount: 0,
        },
      ],
    });
    h.fetchMemberDetail.mockReset();
    h.activity.mockResolvedValue({favoriteCount:1,recentCount:0,requestCount:0,favorites:[{product_id:'food',products:{name:'QA 사료',brand_name:'브랜드'}}],recentViews:[],requests:[]});
    h.correct.mockReset().mockResolvedValue({ok:true});
  });

  afterEach(() => cleanup());

  it('Auth에는 있지만 공개 프로필이 없는 기존 가입자도 구분해 표시한다', async () => {
    render(<AdminMembers />);

    expect(await screen.findByText('old-member@example.com')).toBeTruthy();
    expect(screen.getByText('프로필 미생성')).toBeTruthy();
    expect(screen.getByText(/이메일 아이디 · 인증됨/)).toBeTruthy();
    expect(screen.getByPlaceholderText('이메일 또는 닉네임 검색')).toBeTruthy();
    expect(screen.getByText('로그인 아이디')).toBeTruthy();
    expect(screen.queryByText('회원 ID')).toBeNull();
    await waitFor(() => expect(h.fetchMembers).toHaveBeenCalledWith(1, 20, ''));
  });

  it('이전 Edge 응답에는 읽기 쉬운 아이디가 없어도 화면이 깨지지 않는다', async () => {
    h.fetchMembers.mockResolvedValue({
      total: 1,
      rows: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          nickname: '기존 회원',
          createdAt: '2025-01-01T00:00:00.000Z',
          petCount: 0,
        },
      ],
    });

    render(<AdminMembers />);
    expect(await screen.findByText('22222222-2222-4222-8222-222222222222')).toBeTruthy();
    expect(screen.getByText('내부 ID 대체 표시')).toBeTruthy();
    expect(screen.getByText('미확인')).toBeTruthy();
  });
  it('shows member activity and corrects a pet using original values and a reason',async()=>{
    const pet={id:'pet',name:'QA보리',petType:'dog',ageGroup:'adult',breed:'말티푸',weight:6.8,allergies:['닭고기'],conditions:[]};
    const detail={id:'member',email:'qa@example.com',loginId:'qa@example.com',nickname:'QA보호자',provider:'email',createdAt:'2026-11-04',lastSignInAt:null,petCount:1,diaryCount:2,reviewCount:0,pets:[pet]};
    h.fetchMemberDetail.mockResolvedValue(detail);render(<AdminMembers/>);
    fireEvent.click(await screen.findByRole('button',{name:'old-member 상세 보기'}));
    expect(await screen.findByText('브랜드 QA 사료')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'QA보리 프로필 정정'}));
    fireEvent.change(screen.getByLabelText('몸무게 (kg)'),{target:{value:'7.2'}});
    fireEvent.change(screen.getByLabelText('처리 사유 (필수)'),{target:{value:'보호자 요청 확인'}});
    fireEvent.click(screen.getByRole('button',{name:'정정 저장'}));
    await waitFor(()=>expect(h.correct).toHaveBeenCalledWith('pet',expect.objectContaining({weight:7.2,allergies:['닭고기']}),expect.objectContaining({weight:6.8}),'보호자 요청 확인'));
  });
});
