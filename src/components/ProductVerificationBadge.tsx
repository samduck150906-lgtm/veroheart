import { CheckCircle2, Clock3, ScanLine, ShieldQuestion } from 'lucide-react';
import type { ProductCatalogSource, ProductVerificationStatus } from '../types';

interface ProductVerificationBadgeProps {
  catalogSource?: ProductCatalogSource;
  verificationStatus?: ProductVerificationStatus;
}

function badgeState({ catalogSource, verificationStatus }: ProductVerificationBadgeProps) {
  if (verificationStatus === 'verified') {
    return {
      label: '정보 확인 완료',
      color: 'var(--safe-strong)',
      background: 'var(--safe-bg)',
      borderColor: 'var(--safe-line)',
      Icon: CheckCircle2,
    };
  }
  if (catalogSource === 'community_scan' && verificationStatus !== 'reviewed') {
    return {
      label: '사용자 스캔 · 검증 전',
      color: '#B45309',
      background: '#FFFBEB',
      borderColor: '#FDE68A',
      Icon: ScanLine,
    };
  }
  if (verificationStatus === 'reviewed') {
    return {
      label: '정보 검토 완료',
      color: 'var(--vr-body-2)',
      background: 'var(--vr-soft)',
      borderColor: 'var(--vr-line)',
      Icon: Clock3,
    };
  }
  return {
    label: '정보 검증 전',
    color: 'var(--vr-body-2)',
    background: 'var(--vr-soft)',
    borderColor: 'var(--vr-line)',
    Icon: ShieldQuestion,
  };
}

export default function ProductVerificationBadge(props: ProductVerificationBadgeProps) {
  const { label, color, background, borderColor, Icon } = badgeState(props);
  return (
    <span
      aria-label={`제품 정보 상태: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        width: 'fit-content',
        maxWidth: '100%',
        padding: '3px 7px',
        borderRadius: '999px',
        border: `1px solid ${borderColor}`,
        color,
        background,
        fontSize: '10.5px',
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Icon size={11} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  );
}
