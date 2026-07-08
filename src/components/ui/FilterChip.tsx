import { Check } from 'lucide-react';

/**
 * 공유 필터 칩 — 검색·필터·정렬 등에서 선택 상태를 명확히 표시한다.
 * (기존 Search 페이지 내부에 중복 정의돼 있던 FilterChip을 승격한 공통 컴포넌트)
 */
export default function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        padding: '10px 20px',
        borderRadius: 24,
        fontSize: 14,
        border: '1px solid',
        borderColor: selected ? 'var(--primary)' : 'var(--line)',
        backgroundColor: selected ? 'var(--primary)' : 'transparent',
        color: selected ? '#191F28' : 'var(--text-muted)',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {selected && <Check size={16} />}
      {label}
    </button>
  );
}
