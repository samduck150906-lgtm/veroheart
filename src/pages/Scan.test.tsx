import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useStore } from '../store/useStore';
import Scan from './Scan';
import type { Product } from '../types';
import { BarcodeLookupError } from '../lib/barcodeLookupError';

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
      <Location />
      <Routes>
        <Route path="/scan" element={<Scan />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

function cameraStream(stop = vi.fn()) {
  const track = Object.assign(new EventTarget(), { stop });
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
}

describe('Scan barcode fallback', () => {
  beforeEach(() => {
    getProductByBarcode.mockReset();
    useStore.setState({ products: [] });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1280);
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(720);
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
    finish!(cameraStream(stop).stream);
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  });

  it('runs the local decoder when the browser has no BarcodeDetector', async () => {
    const stop = vi.fn();
    const { stream } = cameraStream(stop);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    vi.stubGlobal('BarcodeDetector', undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData: vi.fn() } as unknown as CanvasRenderingContext2D);
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(123);
    const view = renderScan();
    await waitFor(() => expect(schedule).toHaveBeenCalled(), { timeout: 10_000 });
    expect(view.container.querySelector('video')?.srcObject).toBe(stream);
    expect(stop).not.toHaveBeenCalled();
    expect(screen.getByLabelText('바코드 번호')).toBeTruthy();
    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  }, 15_000);

  it('continues scanning after a non-product code instead of freezing on the frame', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => cameraStream().stream,
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

  it('validates a scanned UPC-E with the public catalog instead of opening a cached match', async () => {
    useStore.setState({ products: [{ id: 'cached-upc-product', barcode: '00042100005264' } as Product] });
    getProductByBarcode.mockResolvedValue({ id: 'upc-product' });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => cameraStream().stream,
    } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.stubGlobal('BarcodeDetector', class { detect = async () => [{ rawValue: '04252614', format: 'upc_e' }]; });
    let frame: FrameRequestCallback;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1; });
    renderScan();
    await waitFor(() => expect(frame).toBeDefined());
    await act(async () => { frame!(1000); });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/product/upc-product'));
    expect(getProductByBarcode).toHaveBeenCalledWith('0042100005264');
  });

  it('does not reopen a cached product that is no longer publicly visible', async () => {
    useStore.setState({ products: [{ id: 'hidden-product', barcode: '8801234567893' } as Product] });
    getProductByBarcode.mockResolvedValue(null);
    renderScan();
    fireEvent.change(await screen.findByLabelText('바코드 번호'), { target: { value: '8801234567893' } });
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/scan/new?barcode=8801234567893'));
  });

  it('directs an ambiguous barcode to name search even when the local cache has one match', async () => {
    useStore.setState({ products: [{ id: 'cached-product', barcode: '8801234567893' } as Product] });
    getProductByBarcode.mockRejectedValue(new BarcodeLookupError('ambiguous'));
    renderScan();
    fireEvent.change(await screen.findByLabelText('바코드 번호'), { target: { value: '8801234567893' } });
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('제품이 여러 개');
    expect(alert.textContent).toContain('제품명으로 검색');
    expect(alert.textContent).not.toContain('인터넷');
    expect(screen.getByTestId('location').textContent).toBe('/scan');
    fireEvent.click(screen.getByRole('button', { name: '제품명으로 직접 검색' }));
    expect(screen.getByTestId('location').textContent).toBe('/search');
  });

  it('keeps a lookup error recoverable instead of treating it as an unregistered barcode', async () => {
    getProductByBarcode.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({ id: 'retry-product' });
    renderScan();
    fireEvent.change(await screen.findByLabelText('바코드 번호'), { target: { value: '8801234567893' } });
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('다시'));
    expect(screen.getByTestId('location').textContent).toBe('/scan');
    fireEvent.click(screen.getByRole('button', { name: '바코드 확인' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/product/retry-product'));
  });

  it('ignores repeated Enter submissions while a lookup is pending', async () => {
    let resolveLookup: (value: { id: string }) => void;
    getProductByBarcode.mockImplementation(() => new Promise((resolve) => { resolveLookup = resolve; }));
    renderScan();
    const input = await screen.findByLabelText('바코드 번호');
    fireEvent.change(input, { target: { value: '8801234567893' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getProductByBarcode).toHaveBeenCalledTimes(1);
    await act(async () => { resolveLookup!({ id: 'single-product' }); });
    expect(screen.getByTestId('location').textContent).toBe('/product/single-product');
  });

  it('offers a camera retry after a temporary camera-in-use failure', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => { throw new DOMException('Camera is busy', 'NotReadableError'); },
    } });
    renderScan();
    expect(await screen.findByRole('button', { name: '카메라 다시 시도' })).toBeTruthy();
  });

  it('releases an interrupted camera and offers a retry', async () => {
    const { track, stream } = cameraStream();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.stubGlobal('BarcodeDetector', class { detect = async () => []; });
    const schedule = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    renderScan();
    await waitFor(() => expect(schedule).toHaveBeenCalled());
    act(() => { track.dispatchEvent(new Event('ended')); });
    expect(screen.getByRole('button', { name: '카메라 다시 시도' })).toBeTruthy();
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it('reacquires the camera after the page returns from the background', async () => {
    const first = cameraStream();
    const second = cameraStream();
    const getUserMedia = vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.stubGlobal('BarcodeDetector', class { detect = async () => []; });
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const view = renderScan();
    await waitFor(() => expect(view.container.querySelector('video')?.srcObject).toBe(first.stream));
    hidden.mockReturnValue(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(first.track.stop).toHaveBeenCalledOnce();
    hidden.mockReturnValue(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(view.container.querySelector('video')?.srcObject).toBe(second.stream));
  });

  it('offers manual lookup when both native and local detection cannot start', async () => {
    const { stream } = cameraStream();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.stubGlobal('BarcodeDetector', class { detect = async () => { throw new Error('Native detector unavailable'); }; });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    let frame: FrameRequestCallback;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1; });
    renderScan();
    await waitFor(() => expect(frame).toBeDefined());
    await act(async () => { frame!(1000); });
    expect(await screen.findByRole('button', { name: '카메라 다시 시도' })).toBeTruthy();
    expect(screen.getByLabelText('바코드 번호')).toBeTruthy();
  });
});
