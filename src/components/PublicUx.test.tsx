import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Test from '../pages/Test';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import { describeProductCompleteness } from '../utils/productDataCompleteness';
import { buildAllergyDisplayState } from '../utils/allergyDisplay';
import ProductRow from './ProductRow';
import ProductVerificationBadge from './ProductVerificationBadge';
import FeedAnalysisCard from './FeedAnalysisCard';

vi.mock('../lib/publicSettings', () => ({ usePublicSettings: () => ({ viralEventVisible: false }) }));
const rawProduct: Product = {
  id: 'raw', name: '원료가 등록된 사료', brand: '브랜드', category: 'food', ingredients: [],
  unknownIngredientTerms: ['신선한 연어 30%', '혼합 비타민'], analysisStatus: 'partial',
  imageUrl: '', reviewsCount: 0, averageRating: 0,
};
afterEach(cleanup);

describe('public app language and actions', () => {
  it('keeps the personality quiz available when the reward promotion is not enabled', () => {
    render(<MemoryRouter><Test /></MemoryRouter>);
    expect(screen.getByText('낯선 사람이 집에 오면 어떻게 반응하나요?')).toBeTruthy();
    expect(screen.queryByText(/이벤트가 종료/)).toBeNull();
  });
  it.each(['pending', undefined] as const)('does not expose an internal pending verification badge (%s)', (verificationStatus) => {
    const { container } = render(<ProductVerificationBadge catalogSource="community_scan" verificationStatus={verificationStatus} />);
    expect(container.textContent).toBe('');
  });
  it('removes comparison from product browsing', () => {
    render(<MemoryRouter><ProductRow product={rawProduct} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /비교/ })).toBeNull();
    expect(screen.getByRole('button', { name: '찜' })).toBeTruthy();
  });
  it('does not call a raw ingredient list missing or expose implementation jargon', () => {
    const { container } = render(<FeedAnalysisCard product={rawProduct} profile={DEFAULT_USER_PET_PROFILE} />);
    expect(container.textContent).not.toMatch(/규칙 기반|AI 미사용|원재료 정보가 아직 등록되지|등록된 원재료 정보가 없어/);
  });
  it('distinguishes raw ingredients awaiting interpretation from an absent label', () => {
    const display = describeProductCompleteness(rawProduct);
    expect(display.level).toBe('partial');
    expect(display.label).not.toContain('없');
    expect(display.detail).toContain('원료');
  });
  it('does not claim raw unmatched ingredients are missing in allergy notices', () => {
    const display = buildAllergyDisplayState({ allergyHits: [], allergyCautions: [] }, '로니', {
      hasIngredientData: false, hasAllergyProfile: true, analysisStatus: 'partial',
      unknownIngredientTerms: rawProduct.unknownIngredientTerms,
    });
    expect(display.unknownReason).toBe('partial_ingredients');
    expect(display.notice?.title).not.toContain('없');
    expect(display.notice?.description).toContain('신선한 연어');
  });
});
