import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useStore } from '../store/useStore';
import Scan from './Scan';

const { getProductByBarcode } = vi.hoisted(() => ({ getProductByBarcode: vi.fn() }));

vi.mock('../lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/supabase')>();
  return { ...original, getProductByBarcode };
});

function Location() {
  return <div data-testid="location">{useLocation().pathname}{useLocation().search}</div>;
}

function renderScan() {
  return render(
    <MemoryRouter initialEntries={['/scan']}>
      <Routes>
        <Route path="*" element={<><Scan /><Location /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Scan barcode fallback', () => {
  beforeEach(() => {
    getProductByBarcode.mockReset();
    useStore.setState({ products: [] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('stops a stream that resolves after the scanner has unmounted', async () => {
    let finish: (stream: MediaStream) => void;
    const stop = vi.fn();
    vi.stubGlobal('BarcodeDetector', class { detect = () => Promise.resolve([]); });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: () => new Promise<MediaStream>((resolve) => { finish = resolve; }),
    } });
    const view = renderScan();
    view.unmount();
    finish!({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  });

  it('runs the local decoder when the browser has no BarcodeDetector', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    vi.stubGlobal('BarcodeDetector', undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData: vi.fn() } as unknown as CanvasRenderingContext2D);
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(123);
    const view = renderScan();
    await waitFor(() => expect(schedule).toHaveBeenCalled(), { timeout: 10_000 });
    expect(view.container.querySelector('video')?.srcObject).toBe(stream);
    expect(stop).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('바코드 번호')).toBeNull();
    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  }, 15_000);

  it('continues scanning after a non-product code instead of freezing on the frame', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => ({ getTracks: () => [{ stop: vi.fn() }] }),
    } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.stubGlobal('BarcodeDetector', class { detect = async () => [{ rawValue: 'WAREHOUSE-A' }]; });
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length; });
    renderScan();
    await waitFor(() => expect(callbacks.length).toBe(1));
    callbacks[0](1000);
    await waitFor(() => expect(callbacks.length).toBe(2));
    expect(getProductByBarcode).not.toHaveBeenCalled();
  });

  it('opens an existing product after manual barcode lookup', async () => {
    getProductByBarcode.mockResolvedValue({ id: 'known-product' });
    renderScan();

    fireEvent.change(await screen.findByLabelText('바코드 번호'), {
      target: { value: '8801234567893' },
    });
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent)
      .toBe('/product/known-product'));
  });

  it('sends an unknown barcode to the contribution flow', async () => {
    getProductByBarcode.mockResolvedValue(null);
    renderScan();

    fireEvent.change(await screen.findByLabelText('바코드 번호'), {
      target: { value: '8801234567893' },
    });
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));

    await waitFor(() => expect(screen.getByTestId('location').textContent)
      .toBe('/scan/new?barcode=8801234567893'));
  });
});
