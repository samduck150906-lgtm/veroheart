import { useState, useEffect, type ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchBar – 재사용 가능한 검색 입력 컴포넌트
 * - 입력값이 바뀔 때마다 debounce(300ms) 로직을 적용하여 onSearch 콜백을 호출합니다.
 * - 입력창 내부에 돋보기 아이콘과 전체 삭제용 X 버튼을 배치합니다.
 * - 디자인은 기존 프리미엄 UI 가이드(Glass, Rounded, Soft Shadow)를 따릅니다.
 */
interface SearchBarProps {
  /** 최초 입력값 (옵션) */
  initialValue?: string;
  /** 입력 변경시 호출되는 콜백, debounce 적용 후 전달 */
  onSearch: (query: string) => void;
  /** placeholder 텍스트 */
  placeholder?: string;
  /** debounce delay ms (default 300) */
  delay?: number;
}

export default function SearchBar({
  initialValue = '',
  onSearch,
  placeholder = '사료·원료 검색',
  delay = 300,
}: SearchBarProps) {
  const [value, setValue] = useState<string>(initialValue);
  const [debounced, setDebounced] = useState<string>(initialValue);

  // Update debounced value after delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value.trim());
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  // Call external onSearch when debounced value changes
  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const clearInput = () => {
    setValue('');
    // Immediately fire search with empty query
    onSearch('');
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--border-radius-md)',
        border: '1.5px solid rgba(0,0,0,0.08)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        maxWidth: '400px',
        transition: 'border-color var(--transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.08)';
      }}
    >
      <Search size={18} color="var(--text-muted)" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          marginLeft: '8px',
          fontSize: '15px',
          color: 'var(--text-dark)',
          fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={clearInput}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginLeft: '4px',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF';
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
