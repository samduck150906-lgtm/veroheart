import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ complete: vi.fn(), initApp: vi.fn(), notify: vi.fn() }));
vi.mock('../lib/nativeAuth', async original => ({ ...await original<typeof import('../lib/nativeAuth')>(), completeAuthCallback: h.complete }));
vi.mock('../store/useStore', () => ({ useStore: () => ({ initApp: h.initApp }) }));
vi.mock('../store/useNotification', () => ({ notify: { error: h.notify, success: h.notify } }));
import AuthCallback from './AuthCallback';
function Destination() { const { pathname, search } = useLocation(); return <p>{pathname + search}</p>; }
function mount(intent: string) { render(<MemoryRouter initialEntries={['/auth/callback?code=test&intent=' + intent]}><Routes><Route path="/auth/callback" element={<AuthCallback />} /><Route path="*" element={<Destination />} /></Routes></MemoryRouter>); }
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); h.initApp.mockResolvedValue(undefined); });
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
