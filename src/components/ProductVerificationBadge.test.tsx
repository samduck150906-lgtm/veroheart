import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductVerificationBadge from './ProductVerificationBadge';

describe('ProductVerificationBadge', () => {
  it('사용자 스캔 대기 제품의 출처와 상태를 정확히 표시한다', () => {
    render(<ProductVerificationBadge catalogSource="community_scan" verificationStatus="pending" />);
    expect(screen.getByText('사용자 스캔 · 검증 전')).toBeTruthy();
  });

  it('확인 완료 제품은 출처와 무관하게 완료 상태를 표시한다', () => {
    render(<ProductVerificationBadge catalogSource="legacy" verificationStatus="verified" />);
    expect(screen.getByText('정보 확인 완료')).toBeTruthy();
  });
});
