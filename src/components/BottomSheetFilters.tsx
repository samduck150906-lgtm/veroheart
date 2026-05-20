import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * BottomSheetFilters – 다중 선택 필터를 위한 바텀 시트 모달
 * - 연령, 주원료, 알레르기 성분을 다중 선택 가능
 * - 선택된 값은 부모에게 `onChange(selected)` 로 전달
 * - 프리미엄 디자인: 블러 배경, 부드러운 슬라이드‑업 애니메이션, 아이콘·체크박스
 */
interface FilterOption {
  label: string;
  value: string;
}

interface FiltersState {
  ages: string[]; // 예: ['puppy', 'adult']
  ingredients: string[]; // 예: ['chicken']
  allergens: string[]; // 예: ['egg']
}

interface BottomSheetFiltersProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫힘 핸들러 */
  onClose: () => void;
  /** 현재 선택값, 변경 시 부모에게 전달 */
  filters: FiltersState;
  /** 선택값 변경 콜백 */
  onChange: (newFilters: FiltersState) => void;
}

const AGE_OPTIONS: FilterOption[] = [
  { label: '퍼피', value: 'puppy' },
  { label: '어덜트', value: 'adult' },
  { label: '시니어', value: 'senior' },
];

const INGREDIENT_OPTIONS: FilterOption[] = [
  { label: '닭고기', value: 'chicken' },
  { label: '연어', value: 'salmon' },
  { label: '소고기', value: 'beef' },
  { label: '양고기', value: 'lamb' },
];

const ALLERGEN_OPTIONS: FilterOption[] = [
  { label: '계란', value: 'egg' },
  { label: '우유', value: 'dairy' },
  { label: '밀', value: 'wheat' },
  { label: '콩', value: 'soy' },
];

export default function BottomSheetFilters({
  open,
  onClose,
  filters,
  onChange,
}: BottomSheetFiltersProps) {
  const [local, setLocal] = useState<FiltersState>(filters);

  // sync when parent changes
  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const toggle = (category: keyof FiltersState, value: string) => {
    setLocal((prev) => {
      const arr = prev[category];
      const exists = arr.includes(value);
      const newArr = exists ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [category]: newArr };
    });
  };

  const apply = () => {
    onChange(local);
    onClose();
  };

  if (!open) return null;

  // portal to body to avoid layout clipping
  return createPortal(
    <div
      className="bottom-sheet-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="bottom-sheet-container"
        style={{{
          background: 'var(--surface-elevated)',
          borderTopLeftRadius: '18px',
          borderTopRightRadius: '18px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.3s ease-out',
        }}}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-dark)' }}>필터</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        {/* Age */}
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>연령</h3>
          {AGE_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="checkbox"
                checked={local.ages.includes(opt.value)}
                onChange={() => toggle('ages', opt.value)}
              />
              <span style={{ marginLeft: '8px' }}>{opt.label}</span>
            </label>
          ))}
        </section>
        {/* Main Ingredient */}
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>주원료</h3>
          {INGREDIENT_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="checkbox"
                checked={local.ingredients.includes(opt.value)}
                onChange={() => toggle('ingredients', opt.value)}
              />
              <span style={{ marginLeft: '8px' }}>{opt.label}</span>
            </label>
          ))}
        </section>
        {/* Allergens */}
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '8px' }}>피해야 할 알레르기 성분</h3>
          {ALLERGEN_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="checkbox"
                checked={local.allergens.includes(opt.value)}
                onChange={() => toggle('allergens', opt.value)}
              />
              <span style={{ marginLeft: '8px' }}>{opt.label}</span>
            </label>
          ))}
        </section>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={apply}
            style={{
              padding: '8px 16px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* Simple slide‑up animation */
const styleElement = document.createElement('style');
styleElement.innerHTML = `
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
`;
document.head.appendChild(styleElement);
