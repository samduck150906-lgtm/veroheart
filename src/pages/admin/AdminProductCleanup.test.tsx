import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProductNameRow } from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  fetchProductNames: vi.fn(),
  applyProductCleanup: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  PRODUCT_CLEANUP_BATCH: 100,
  fetchProductNames: h.fetchProductNames,
  applyProductCleanup: h.applyProductCleanup,
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: h.success, error: h.error, warning: h.warning },
}));

import AdminProductCleanup from './AdminProductCleanup';

const SAFE_ID = '11111111-1111-4111-8111-111111111111';
const REVIEW_ID = '22222222-2222-4222-8222-222222222222';

function row(id: string, name: string, brand = '오리젠'): ProductNameRow {
  return { id, name, brand_name: brand, main_category: '사료', image_url: 'https://example.com/product.jpg' };
}

const ROWS = [
  row(SAFE_ID, '[특가] 오리젠 오리지널 캣'),
  row(REVIEW_ID, '펫트리언츠 오리 동결건조 간식', '쿠팡검색'),
];

function applied(ids: string[]) {
  return {
    batchId: 'batch', requested: ids.length, applied: ids.length, conflicts: 0, failed: 0,
    results: ids.map((id) => ({ id, status: 'applied' as const })),
  };
}

describe('AdminProductCleanup', () => {
  beforeEach(() => {
    h.fetchProductNames.mockReset().mockResolvedValue(ROWS);
    h.applyProductCleanup.mockReset().mockImplementation((items: Array<{ id: string }>) =>
      Promise.resolve(applied(items.map((item) => item.id))));
    h.success.mockReset();
    h.error.mockReset();
    h.warning.mockReset();
  });

  afterEach(() => cleanup());

  it('안전한 제안 전체 선택에서 확인 필요 브랜드를 제외하고 전체 해제한다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');

    fireEvent.click(screen.getByRole('button', { name: /안전한 제안 전체 선택/ }));
    expect((screen.getByLabelText(`${SAFE_ID} 제품명 선택`) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(`${REVIEW_ID} 브랜드 선택`) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/선택 제품 1건/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /전체 선택 해제/ }));
    expect((screen.getByLabelText(`${SAFE_ID} 제품명 선택`) as HTMLInputElement).checked).toBe(false);
  });

  it('운영자가 자동 제안값을 바꾸면 안전한 전체 선택에 포함하지 않는다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');

    fireEvent.change(screen.getByLabelText(`${SAFE_ID} 제안 제품명`), {
      target: { value: '임의로 바꾼 제품명' },
    });
    fireEvent.click(screen.getByRole('button', { name: /안전한 제안 전체 선택/ }));

    expect((screen.getByLabelText(`${SAFE_ID} 제품명 선택`) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('button', { name: /선택 0건 검토/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('선택한 후 검색에서 숨겨져도 적용 대상을 유지한다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');
    fireEvent.click(screen.getByLabelText(`${SAFE_ID} 제품명 선택`));

    fireEvent.change(screen.getByLabelText('현재 또는 제안 제품명·브랜드 검색'), { target: { value: '펫트리언츠' } });
    expect(screen.queryByText('[특가] 오리젠 오리지널 캣')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /선택 1건 검토/ }));
    expect(screen.getByRole('dialog').textContent).toContain('[특가] 오리젠 오리지널 캣');
  });

  it('현재값과 제안값을 검색하고 제품명·브랜드를 독립 선택한다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');

    fireEvent.change(screen.getByLabelText('현재 또는 제안 제품명·브랜드 검색'), { target: { value: '펫트리언츠' } });
    expect(screen.queryByText('[특가] 오리젠 오리지널 캣')).toBeNull();
    expect(screen.getByText('펫트리언츠 오리 동결건조 간식')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(`${REVIEW_ID} 브랜드 선택`));
    fireEvent.click(screen.getByRole('button', { name: /선택 1건 검토/ }));
    expect(screen.getByRole('dialog').textContent).toContain('브랜드');
    expect(screen.getByRole('dialog').textContent).not.toContain('제품명 쿠팡검색');
  });

  it('저장 전 전후 비교를 확인하고 성공 후 최신 데이터를 다시 조회한다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');
    fireEvent.click(screen.getByLabelText(`${SAFE_ID} 제품명 선택`));
    fireEvent.click(screen.getByRole('button', { name: /선택 1건 검토/ }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('[특가] 오리젠 오리지널 캣');
    expect(dialog.textContent).toContain('오리젠 오리지널 캣');
    fireEvent.click(screen.getByRole('button', { name: '확인 후 적용' }));

    await waitFor(() => expect(h.applyProductCleanup).toHaveBeenCalledWith([{
      id: SAFE_ID,
      expectedName: '[특가] 오리젠 오리지널 캣',
      expectedBrandName: '오리젠',
      name: '오리젠 오리지널 캣',
    }]));
    await waitFor(() => expect(h.fetchProductNames).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('최근 적용 결과')).toBeTruthy();
  });

  it('충돌과 오류 결과를 명확히 표시한다', async () => {
    h.applyProductCleanup.mockResolvedValue({
      batchId: 'batch', requested: 1, applied: 0, conflicts: 1, failed: 0,
      results: [{ id: SAFE_ID, status: 'conflict', message: '다른 운영자가 변경했습니다.' }],
    });
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 오리젠 오리지널 캣');
    fireEvent.click(screen.getByLabelText(`${SAFE_ID} 제품명 선택`));
    fireEvent.click(screen.getByRole('button', { name: /선택 1건 검토/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 후 적용' }));

    expect(await screen.findByText(/동시 수정 충돌/)).toBeTruthy();
    expect(screen.getByText(/다른 운영자가 변경했습니다/)).toBeTruthy();
    expect(h.warning).toHaveBeenCalled();
  });

  it('브랜드만 수정하면 제품명은 저장 요청에서 제외한다', async () => {
    render(<AdminProductCleanup />);
    await screen.findByText('펫트리언츠 오리 동결건조 간식');
    fireEvent.change(screen.getByLabelText(`${REVIEW_ID} 제안 브랜드`), { target: { value: '펫트리언츠코리아' } });
    fireEvent.click(screen.getByLabelText(`${REVIEW_ID} 브랜드 선택`));
    fireEvent.click(screen.getByRole('button', { name: /선택 1건 검토/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 후 적용' }));

    await waitFor(() => expect(h.applyProductCleanup).toHaveBeenCalledWith([{
      id: REVIEW_ID,
      expectedName: '펫트리언츠 오리 동결건조 간식',
      expectedBrandName: '쿠팡검색',
      brandName: '펫트리언츠코리아',
    }]));
  });

  it('100건 초과 선택을 두 배치로 나누고 제한을 안내한다', async () => {
    const many = Array.from({ length: 101 }, (_, index) => row(
      `${String(index + 1).padStart(8, '0')}-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
      `[특가] 테스트 제품 ${index + 1}`,
      `브랜드 ${index + 1}`,
    ));
    h.fetchProductNames.mockResolvedValue(many);
    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 테스트 제품 1');
    fireEvent.click(screen.getByRole('button', { name: /안전한 제안 전체 선택/ }));
    expect(screen.getByRole('status').textContent).toContain('100건씩 나누어 적용');
    fireEvent.click(screen.getByRole('button', { name: /선택 101건 검토/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 후 적용' }));
    await waitFor(() => expect(h.applyProductCleanup).toHaveBeenCalledTimes(2));
    expect(h.applyProductCleanup.mock.calls[0][0]).toHaveLength(100);
    expect(h.applyProductCleanup.mock.calls[1][0]).toHaveLength(1);
  });

  it('후속 배치 요청 실패 시 앞선 배치의 실제 적용 결과를 보존한다', async () => {
    const many = Array.from({ length: 101 }, (_, index) => row(
      `${String(index + 1).padStart(8, '0')}-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
      `[특가] 테스트 제품 ${index + 1}`,
      `브랜드 ${index + 1}`,
    ));
    h.fetchProductNames.mockResolvedValue(many);
    h.applyProductCleanup
      .mockResolvedValueOnce(applied(many.slice(0, 100).map(({ id }) => id)))
      .mockRejectedValueOnce(new Error('network unavailable'));

    render(<AdminProductCleanup />);
    await screen.findByText('[특가] 테스트 제품 1');
    fireEvent.click(screen.getByRole('button', { name: /안전한 제안 전체 선택/ }));
    fireEvent.click(screen.getByRole('button', { name: /선택 101건 검토/ }));
    fireEvent.click(screen.getByRole('button', { name: '확인 후 적용' }));

    await waitFor(() => expect(h.error).toHaveBeenCalledWith(expect.stringContaining('100건은 앞선 배치에서 적용')));
    expect(await screen.findByText('최근 적용 결과')).toBeTruthy();
  });
});
