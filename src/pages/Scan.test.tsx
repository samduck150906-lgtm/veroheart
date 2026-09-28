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

  afterEach(() => cleanup());

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
