import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import NativeAuthListener from './NativeAuthListener';

const bridge = vi.hoisted(() => ({ callback: null as null | ((data: { url: string }) => void), remove: vi.fn(), getLaunchUrl: vi.fn(), close: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: {
  addListener: async (_event: string, callback: (data: { url: string }) => void) => { bridge.callback = callback; return { remove: bridge.remove }; },
  getLaunchUrl: bridge.getLaunchUrl,
} }));
vi.mock('@capacitor/browser', () => ({ Browser: { close: bridge.close } }));
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><output>{location.pathname}{location.search}</output><button onClick={() => navigate('/home')}>Home</button></>; }
function show() { return render(<MemoryRouter><NativeAuthListener /><Location /></MemoryRouter>); }
beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  bridge.callback = null;
  bridge.getLaunchUrl.mockResolvedValue(undefined);
  bridge.close.mockResolvedValue(undefined);
  bridge.remove.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('native deep link handling', () => {
  it('restores a cold-start recovery link into the callback route', async () => {
    bridge.getLaunchUrl.mockResolvedValue({ url: 'com.veroro.app://auth/callback?code=cold&intent=recovery' });
    show();
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('/auth/callback?code=cold&intent=recovery'));
  });
  it('does not replay the launch link after the callback has navigated away', async () => {
    bridge.getLaunchUrl.mockResolvedValue({ url: 'com.veroro.app://auth/callback?code=once' });
    show();
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('/auth/callback?code=once'));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Home' })));
    expect(screen.getByRole('status').textContent).toBe('/home');
  });
  it('accepts a running-app callback but ignores foreign hosts and cleans up its listener', async () => {
    const view = show();
    await act(async () => bridge.callback!({ url: 'evil://auth/callback?code=evil' }));
    expect(screen.getByRole('status').textContent).toBe('/');
    await act(async () => bridge.callback!({ url: 'com.veroro.app://auth/callback?code=warm&next=https://evil.example' }));
    expect(screen.getByRole('status').textContent).toBe('/auth/callback?code=warm');
    view.unmount();
    await waitFor(() => expect(bridge.remove).toHaveBeenCalledOnce());
  });
  it('ignores a late cold-start result after cleanup', async () => {
    let finish: (data: { url: string }) => void;
    bridge.getLaunchUrl.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const view = show();
    view.unmount();
    bridge.close.mockClear();
    await act(async () => finish!({ url: 'com.veroro.app://auth/callback?code=late' }));
    expect(bridge.close).not.toHaveBeenCalled();
  });
});
