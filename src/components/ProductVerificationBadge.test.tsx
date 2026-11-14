import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductVerificationBadge from './ProductVerificationBadge';

describe('ProductVerificationBadge', () => {
  it('사용자에게 내부 검토 대기 상태를 표시하지 않는다', () => {
    const { container } = render(<ProductVerificationBadge catalogSource="community_scan" verificationStatus="pending" />);
    expect(container.textContent).toBe('');
  });

  it('완료 제품에도 내부 검토 배지를 표시하지 않는다', () => {
    const { container } = render(<ProductVerificationBadge catalogSource="legacy" verificationStatus="verified" />);
    expect(container.textContent).toBe('');
  });
});
