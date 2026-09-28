import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminScanSubmissions from './AdminScanSubmissions';

const api = vi.hoisted(() => ({
  fetchAdminScanSubmissions: vi.fn(),
  fetchAdminScanEvidence: vi.fn(),
  reviewAdminScanSubmission: vi.fn(),
}));

vi.mock('../../lib/adminApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/adminApi')>(),
  ...api,
}));

const row = {
  id: '22222222-2222-4222-8222-222222222222',
  status: 'needs_review',
  scannedBarcode: '8801234567893',
  errorCode: 'ambiguous_duplicate',
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T01:00:00.000Z',
  resolvedProductId: null,
  productName: '오리지널 독',
  brandName: '베로로',
  contributorEmail: 'private@example.com',
  rawStoragePaths: ['secret/user/path.webp'],
};

describe('AdminScanSubmissions', () => {
  beforeEach(() => {
    api.fetchAdminScanSubmissions.mockReset().mockResolvedValue({ rows: [row], total: 1 });
    api.fetchAdminScanEvidence.mockReset().mockResolvedValue({ front: ['https://signed.test/front'], ingredient: [], nutrition: [] });
    api.reviewAdminScanSubmission.mockReset().mockResolvedValue({ status: 'published' });
  });
  afterEach(() => cleanup());

  it('does not render contributor identity or raw private storage paths', async () => {
    render(<AdminScanSubmissions />);
    expect(await screen.findByText('오리지널 독')).toBeTruthy();
    expect(document.body.textContent).not.toContain('private@example.com');
    expect(document.body.textContent).not.toContain('secret/user/path.webp');
  });

  it('provides state, error, and date filters', async () => {
    render(<AdminScanSubmissions />);
    await screen.findByText('오리지널 독');
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'failed' } });
    fireEvent.change(screen.getByLabelText('오류 코드'), { target: { value: 'extraction_failed' } });
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-09-01' } });
    await waitFor(() => expect(api.fetchAdminScanSubmissions).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'failed', errorCode: 'extraction_failed', dateFrom: '2026-09-01',
    })));
  });

  it('requires an exact target product UUID and a reason before merge, then refreshes', async () => {
    render(<AdminScanSubmissions />);
    fireEvent.click(await screen.findByRole('button', { name: '처리 열기' }));
    const merge = screen.getByRole('button', { name: '기존 제품에 병합' });
    expect(merge).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('대상 제품 ID'), { target: { value: '33333333-3333-4333-8333-333333333333' } });
    fireEvent.change(screen.getByLabelText('처리 사유'), { target: { value: '동일 바코드 공식 제품 확인' } });
    fireEvent.click(merge);

    await waitFor(() => expect(api.reviewAdminScanSubmission).toHaveBeenCalledWith({
      id: row.id,
      decision: 'merge',
      targetProductId: '33333333-3333-4333-8333-333333333333',
      reason: '동일 바코드 공식 제품 확인',
    }));
    await waitFor(() => expect(api.fetchAdminScanSubmissions.mock.calls.length).toBeGreaterThan(1));
  });
});
