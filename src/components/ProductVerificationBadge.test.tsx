import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductVerificationBadge from './ProductVerificationBadge';

describe('ProductVerificationBadge', () => {
  it('사용자에게 내부 검토 대기 상태를 표시하지 않는다', () => {
    const { container } = render(<ProductVerificationBadge catalogSource="community_scan" verificationStatus="pending" />);
    expect(container.textContent).toBe('');
  });

  it('확인 완료 제품은 출처와 무관하게 완료 상태를 표시한다', () => {
    render(<ProductVerificationBadge catalogSource="legacy" verificationStatus="verified" />);
    expect(screen.getByText('정보 확인 완료')).toBeTruthy();
  });
});
