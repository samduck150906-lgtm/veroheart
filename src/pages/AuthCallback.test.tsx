import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ complete: vi.fn(), initApp: vi.fn(), notify: vi.fn(),getUser:vi.fn(),updateUser:vi.fn() }));
vi.mock('../lib/supabase',()=>({supabase:{auth:{getUser:h.getUser,updateUser:h.updateUser}}}));
vi.mock('../lib/nativeAuth', async original => ({ ...await original<typeof import('../lib/nativeAuth')>(), completeAuthCallback: h.complete }));
vi.mock('../store/useStore', () => ({ useStore: () => ({ initApp: h.initApp }) }));
vi.mock('../store/useNotification', () => ({ notify: { error: h.notify, success: h.notify } }));
import AuthCallback from './AuthCallback';
import { rememberAuthReturn } from '../lib/authReturn';
function Destination() { const { pathname, search } = useLocation(); return <p>{pathname + search}</p>; }
function mount(intent: string) { render(<MemoryRouter initialEntries={['/auth/callback?code=test&intent=' + intent]}><Routes><Route path="/auth/callback" element={<AuthCallback />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>); }
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); h.initApp.mockResolvedValue(undefined); h.updateUser.mockResolvedValue({error:null}); });
it('skips repeat consent for an account with existing history and preserves the requested registration return',async()=>{
  h.complete.mockResolvedValue({intent:'signin'});h.getUser.mockResolvedValue({data:{user:{user_metadata:{privacy_acknowledged:true}}},error:null});
  rememberAuthReturn('/profile?tab=pets&add=1');mount('signin');
  expect(await screen.findByText('/profile?tab=pets&add=1')).toBeTruthy();
  expect(h.updateUser).not.toHaveBeenCalled();expect(screen.queryByRole('checkbox')).toBeNull();
});
it('requires and records explicit consent only when history is absent',async()=>{
  h.complete.mockResolvedValue({intent:'signin'});h.getUser.mockResolvedValue({data:{user:{user_metadata:{}}},error:null});mount('signin');
  const submit=await screen.findByRole('button',{name:'동의하고 계속하기'});
  expect(submit).toHaveProperty('disabled',true);expect(h.initApp).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(submit);
  expect(await screen.findByText('/profile')).toBeTruthy();
  expect(h.updateUser).toHaveBeenCalledWith({data:expect.objectContaining({privacy_acknowledged:true})});
});
it.each([['account', '/account/find?mode=id&verified=1'], ['recovery', '/auth/recovery']])('routes verified %s callbacks to their next step', async (intent, target) => {
  h.complete.mockResolvedValue({ intent }); mount(intent);
  expect(await screen.findByText(target)).toBeTruthy();
  expect(h.initApp).toHaveBeenCalledOnce();
});
it.each([['account', '/account/find?mode=id&link=expired'], ['recovery', '/account/find?mode=password&link=expired']])('lets expired %s links restart the corresponding flow', async (intent, target) => {
  h.complete.mockRejectedValue(new Error('인증 링크 만료')); mount(intent);
  expect(await screen.findByText(target)).toBeTruthy();
  expect(h.initApp).not.toHaveBeenCalled();
});
