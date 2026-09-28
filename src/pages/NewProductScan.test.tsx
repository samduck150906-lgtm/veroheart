import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { useStore } from '../store/useStore';
import NewProductScan, { type NewProductScanApi } from './NewProductScan';

const extracted = {
  identity: {
    name: '오리지널 독', brand: '베로로', manufacturer: null,
    species: 'dog', productType: 'food', variantName: null, netWeightText: null,
  },
  labelPanels: { ingredientText: '연어, 쌀', nutritionText: null, registrationText: null },
  ingredients: [{ position: 1, name: '연어' }, { position: 2, name: '쌀' }],
  guaranteedComponents: [{ name: '조단백질', value: 24, unit: '%', qualifier: 'min' }],
  registeredComponents: [],
  fieldConfidence: { identity: 0.9 },
  printedBarcode: '8801234567893',
};

function api(): NewProductScanApi {
  return {
    createScan: vi.fn().mockResolvedValue({ id: 'scan-1', status: 'draft', scannedBarcode: '8801234567893' }),
    requestUploadUrl: vi.fn().mockImplementation((_id, category) => Promise.resolve({
      path: `user/scan/${category}/image.webp`,
      signedUrl: `https://upload.test/${category}`,
    })),
    uploadEvidence: vi.fn().mockResolvedValue(undefined),
    submitImages: vi.fn().mockResolvedValue({ status: 'processing' }),
    getScanStatus: vi.fn().mockResolvedValue({
      id: 'scan-1', status: 'needs_confirmation', errorCode: null,
      extractedData: extracted, fieldConfidence: {}, resolvedProductId: null,
    }),
    confirmExtraction: vi.fn().mockResolvedValue({ status: 'submitted' }),
    publishScan: vi.fn().mockResolvedValue({ status: 'published', productId: 'product-1' }),
  };
}

function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderPage(client: NewProductScanApi) {
  return render(
    <MemoryRouter initialEntries={['/scan/new?barcode=8801234567893']}>
      <Routes>
        <Route path="*" element={<><NewProductScan api={client} prepareImage={async (file) => file} /><Location /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewProductScan', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ isLoggedIn: true, userId: 'user-1' });
  });
  afterEach(() => cleanup());

  it('asks the visitor to log in before contributing', () => {
    useStore.setState({ isLoggedIn: false, userId: null });
    renderPage(api());
    expect(screen.getByText('로그인 후 제품 정보를 등록할 수 있어요')).toBeTruthy();
    expect(screen.getByRole('link', { name: '로그인하기' }).getAttribute('href')).toContain('/login');
  });

  it('shows the three required evidence labels', () => {
    renderPage(api());
    expect(screen.getByText('제품 전면')).toBeTruthy();
    expect(screen.getByText('원재료명')).toBeTruthy();
    expect(screen.getByText('영양/등록성분')).toBeTruthy();
  });

  it('uploads, confirms editable extraction, and opens the published product', async () => {
    const client = api();
    renderPage(client);
    const file = new File(['pixels'], 'label.webp', { type: 'image/webp' });

    for (const label of ['제품 전면 사진', '원재료명 사진', '영양/등록성분 사진']) {
      fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
    }

    expect(await screen.findByDisplayValue('오리지널 독')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('제품명'), { target: { value: '오리지널 독 수정' } });
    fireEvent.click(screen.getByLabelText('라벨 내용이 실제 포장과 같아요'));
    fireEvent.click(screen.getByRole('button', { name: '확인하고 공개하기' }));

    await waitFor(() => expect(client.confirmExtraction).toHaveBeenCalledWith(
      'scan-1',
      expect.objectContaining({ name: '오리지널 독 수정' }),
      '8801234567893',
    ));
    await waitFor(() => expect(screen.getByTestId('location').textContent)
      .toBe('/product/product-1'));
  });

  it('offers a retry after processing failure', async () => {
    const client = api();
    vi.mocked(client.getScanStatus).mockResolvedValueOnce({
      id: 'scan-1', status: 'failed', errorCode: 'extraction_failed',
      extractedData: {}, fieldConfidence: {}, resolvedProductId: null,
    });
    renderPage(client);
    const file = new File(['pixels'], 'label.webp', { type: 'image/webp' });
    for (const label of ['제품 전면 사진', '원재료명 사진', '영양/등록성분 사진']) {
      fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
    }
    expect(await screen.findByRole('button', { name: '다시 분석하기' })).toBeTruthy();
  });
});
