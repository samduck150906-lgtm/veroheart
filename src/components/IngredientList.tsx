// @ts-nocheck
/**
 * IngredientList
 * - 각 성분을 안전 등급(safe / caution / danger) 에 따라 색상 점으로 표시
 * - 성분 클릭 시 바텀시트로 상세 설명 표시
 */
import { useState } from 'react';
import { X, Info } from 'lucide-react';

export type IngredientSafety = 'safe' | 'caution' | 'danger';

export interface Ingredient {
  name: string;
  safety: IngredientSafety;
  role?: string;       // e.g. "주단백질 원료"
  description?: string;
}

interface IngredientListProps {
  ingredients: Ingredient[];
}

const DOT_COLOR: Record<IngredientSafety, string> = {
  safe:    '#22c55e',
  caution: '#f59e0b',
  danger:  '#F04452',
};

const DOT_LABEL: Record<IngredientSafety, string> = {
  safe:    '안전',
  caution: '주의',
  danger:  '위험',
};

function BottomSheet({ item, onClose }: { item: Ingredient; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div className="ing-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className="ing-sheet">
        <div className="ing-sheet-handle" />
        <div className="ing-sheet-header">
          <span
            className="ing-dot ing-dot--lg"
            style={{ background: DOT_COLOR[item.safety] }}
          />
          <div>
            <div className="ing-sheet-name">{item.name}</div>
            {item.role && <div className="ing-sheet-role">{item.role}</div>}
          </div>
          <button className="ing-sheet-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="ing-sheet-badge" style={{ background: DOT_COLOR[item.safety] + '22', color: DOT_COLOR[item.safety], borderColor: DOT_COLOR[item.safety] }}>
          {DOT_LABEL[item.safety]}
        </div>

        {item.description ? (
          <p className="ing-sheet-desc">{item.description}</p>
        ) : (
          <p className="ing-sheet-desc" style={{ color: 'var(--text-secondary)' }}>추가 설명이 없습니다.</p>
        )}
      </div>
    </>
  );
}

export default function IngredientList({ ingredients }: IngredientListProps) {
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [showAll, setShowAll] = useState(false);

  const safeCount    = ingredients.filter((i) => i.safety === 'safe').length;
  const cautionCount = ingredients.filter((i) => i.safety === 'caution').length;
  const dangerCount  = ingredients.filter((i) => i.safety === 'danger').length;

  const PREVIEW_COUNT = 6;
  const displayedIngredients = showAll ? ingredients : ingredients.slice(0, PREVIEW_COUNT);
  const hasMore = ingredients.length > PREVIEW_COUNT;

  return (
    <div className="ing-wrap">
      {/* Header */}
      <div className="ing-header">
        <h3 className="ing-title">전성분 목록</h3>
        <div className="ing-legend">
          <span><span className="ing-dot" style={{ background: '#22c55e' }} />{safeCount} 안전</span>
          <span><span className="ing-dot" style={{ background: '#f59e0b' }} />{cautionCount} 주의</span>
          <span><span className="ing-dot" style={{ background: '#F04452' }} />{dangerCount} 위험</span>
        </div>
      </div>

      {/* Hint */}
      <div className="ing-hint">
        <Info size={12} />
        <span>성분 이름을 탭하면 상세 설명을 볼 수 있어요</span>
      </div>

      {/* List */}
      <div className="ing-list">
        {displayedIngredients.map((ing, idx) => (
          <button
            key={idx}
            className="ing-item"
            onClick={() => setSelected(ing)}
          >
            <span className="ing-rank">{idx + 1}</span>
            <span className="ing-dot" style={{ background: DOT_COLOR[ing.safety] }} />
            <span className="ing-name">{ing.name}</span>
            {ing.role && <span className="ing-role">{ing.role}</span>}
          </button>
        ))}
      </div>

      {/* Show more / less button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            width: '100%', marginTop: '10px', padding: '12px',
            borderRadius: '12px', border: '1px solid var(--hairline)',
            background: 'var(--fill)', color: 'var(--ink-soft)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          {showAll
            ? `접기 ▲`
            : `전성분 더보기 (${ingredients.length - PREVIEW_COUNT}개) ▼`}
        </button>
      )}

      {/* Bottom sheet */}
      {selected && (
        <BottomSheet item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
