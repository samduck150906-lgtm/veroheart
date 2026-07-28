import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DashboardPayload } from '../../lib/adminApi';

const h = vi.hoisted(() => ({ fetchDashboard: vi.fn(), counts: {} as Record<string, number> }));

vi.mock('../../lib/adminApi', () => ({ fetchDashboard: h.fetchDashboard }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col: string, value: string) => Promise.resolve({ count: h.counts[value] ?? 0, error: null }),
      }),
    }),
  },
}));

import AdminDashboard from './AdminDashboard';

const PAYLOAD: DashboardPayload = {
  metrics: {
    products: 458,
    ingredients: 539,
    productIngredientLinks: 4265,
    users: 120,
    unmatchedPending: 509,
    feedingLogsLast7: 33,
    productsLast7: 12,
    productsPrev7: 10,
    usersLast7: 4,
    usersPrev7: 8,
  },
  recentProducts: [
    { id: 'p1', name: '오리젠 피트앤트림', brand_name: '오리젠', created_at: '2026-07-20T00:00:00Z' },
  ],
  recentIngredients: [
    { id: 'i1', name_ko: '타우린', risk_level: 'safe', created_at: '2026-07-21T00:00:00Z' },
  ],
  recentUnmatched: [
    { id: 'u1', raw_name: '동물성 지방', occurrences: 42, last_seen_at: '2026-07-22T00:00:00Z' },
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    h.fetchDashboard.mockReset().mockResolvedValue(PAYLOAD);
    h.counts = { 사료: 300, 간식: 100 };
  });

  afterEach(() => cleanup());

  it('실제 지표를 표시한다', async () => {
    renderDashboard();
    expect(await screen.findByText('458')).toBeTruthy();
    expect(screen.getByText('4,265')).toBeTruthy();
    expect(screen.getByText('509')).toBeTruthy();
  });

  it('하드코딩된 목데이터를 더 이상 렌더링하지 않는다', async () => {
    renderDashboard();
    await screen.findByText('458');

    // 이전 버전의 가짜 활동/증감률
    expect(screen.queryByText(/사용자_772/)).toBeNull();
    expect(screen.queryByText(/사용자_102/)).toBeNull();
    expect(screen.queryByText(/\+12\.5%/)).toBeNull();
    expect(screen.queryByText(/\+15\.8%/)).toBeNull();
    expect(screen.queryByText('활동 내역 더보기')).toBeNull();
  });

  it('커머스 제거 이후 주문 지표를 표시하지 않는다', async () => {
    renderDashboard();
    await screen.findByText('458');
    expect(screen.queryByText(/누적 주문수/)).toBeNull();
  });

  it('증감률을 실제 기간 비교로 계산한다', async () => {
    renderDashboard();
    // 제품: 12 vs 10 → +20.0%,  회원: 4 vs 8 → -50.0%
    expect(await screen.findByText(/\+20\.0%/)).toBeTruthy();
    expect(screen.getByText(/-50\.0%/)).toBeTruthy();
  });

  it('최근 운영 활동을 실제 데이터로 채운다', async () => {
    renderDashboard();
    expect(await screen.findByText(/오리젠 피트앤트림/)).toBeTruthy();
    expect(screen.getByText(/타우린/)).toBeTruthy();
    expect(screen.getByText(/동물성 지방/)).toBeTruthy();
  });

  it('지표 조회가 실패해도 화면이 무너지지 않고 재시도를 제공한다', async () => {
    h.fetchDashboard.mockRejectedValue(new Error('관리자 인증 실패'));
    renderDashboard();

    await waitFor(() => expect(screen.getByText('지표를 불러오지 못했습니다.')).toBeTruthy());
    expect(screen.getByText('다시 시도')).toBeTruthy();
    // 카테고리 분포 카드는 독립적으로 계속 렌더링된다
    expect(screen.getByText('카테고리별 제품 분포')).toBeTruthy();
  });
});
