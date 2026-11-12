import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TestPage from './Test';
import { VIRAL_TEST_CAMPAIGN } from '../copy/marketing';

vi.mock('../lib/kakaoShare', () => ({ isKakaoShareConfigured: () => false, kakaoShareTextWithLink: vi.fn() }));
const messages = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('../store/useNotification', () => ({ notify: { ...messages, warning: vi.fn() } }));
function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function show() { render(<MemoryRouter><TestPage /><Location /></MemoryRouter>); }
function answer(skip = 0) {
  VIRAL_TEST_CAMPAIGN.questions.forEach((question,index) => fireEvent.click(screen.getByRole('button', { name: index < skip ? '해당 없음 · 관찰하지 못했어요' : question.options[0], exact: true })));
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); messages.success.mockReset(); messages.error.mockReset(); });
describe('성향 테스트 요청 수정', () => {
  it('관찰하지 못한 응답만 있으면 성향을 만들어 내지 않고 다시 선택할 수 있다', () => {
    show(); answer(8);
    expect(screen.getByRole('heading',{name:'관찰한 답변이 부족합니다'})).toBeTruthy();
    expect(screen.queryByText(/NaN|Infinity/)).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'답변 다시 선택하기'}));
    expect(screen.getByText(VIRAL_TEST_CAMPAIGN.questions[0].prompt)).toBeTruthy();
  });
  it('관찰 문항 4개면 결과를 제공하고 일반 제품 탐색임을 명시한다', () => {
    show(); answer(4);
    expect(screen.queryByText('관찰한 답변이 부족합니다')).toBeNull();
    expect(screen.getByRole('button',{name:'카카오톡 공유 준비 중'})).toHaveProperty('disabled',true);
    fireEvent.click(screen.getByRole('button',{name:'전체 제품 둘러보기'}));
    expect(screen.getByTestId('location').textContent).toBe('/search');
  });
  it.each(['rejected','unavailable'])('복사 %s 때 성공 알림 없이 수동 문구를 제공한다',async mode => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='unavailable'?undefined:{writeText:vi.fn().mockRejectedValue(new Error('Denied'))}});
    show(); answer(); fireEvent.click(screen.getByRole('button',{name:'공유 문구 복사'}));
    expect(await screen.findByRole('textbox',{name:'복사할 공유 문구'})).toHaveProperty('readOnly',true);
    expect(messages.success).not.toHaveBeenCalled();
    expect(messages.error).toHaveBeenCalledOnce();
  });
});
