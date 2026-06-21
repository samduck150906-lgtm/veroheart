// @ts-nocheck
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { Search as SearchIcon, X, ChevronRight } from 'lucide-react';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';
import { INGREDIENT_DICT } from '../copy/ui';

const CATEGORY_LABELS: Record<string, string> = {
  animal_protein: '동물성 단백질',
  processed_protein: '가공 단백질',
  animal_fat: '동물성 지방',
  oil: '오일·지방',
  carbohydrate: '탄수화물',
  legume: '콩과 식물',
  vegetable: '채소',
  fruit: '과일',
  vitamin_mineral: '비타민·미네랄',
  probiotic: '유산균',
  additive: '첨가물',
  preservative: '보존제',
  sweetener: '감미료',
};

const SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  safe: { label: '안전', color: 'var(--safe)', bg: 'var(--safe-tint)' },
  watch: { label: '참고', color: '#A16207', bg: 'var(--primary-tint-2)' },
  caution: { label: '주의', color: '#A16207', bg: 'var(--caution-tint)' },
  danger: { label: '위험', color: 'var(--danger)', bg: 'var(--danger-tint)' },
};

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'animal_protein', label: '단백질' },
  { key: 'carbohydrate', label: '탄수화물' },
  { key: 'oil', label: '지방·오일' },
  { key: 'vitamin_mineral', label: '비타민·미네랄' },
  { key: 'preservative', label: '보존제' },
  { key: 'additive', label: '첨가물' },
];

const TAG_LABELS: Record<string, string> = {
  protein: '단백질', omega3: '오메가3', fiber: '식이섬유', taurine: '타우린',
  calcium: '칼슘', joint: '관절', probiotic: '유산균', antioxidant: '항산화',
  toxic_dog: '강아지 독성', toxic_cat: '고양이 독성', controversial: '논란 성분', high_sugar: '고당분',
  chicken: '닭', beef: '소', pork: '돼지', duck: '오리', salmon: '연어', fish: '생선',
  lamb: '양', turkey: '칠면조', egg: '계란', grain: '곡물', poultry: '가금류', dairy: '유제품',
};

export default function IngredientDictionary() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INGREDIENT_DICTIONARY.filter((it) => {
      if (filter !== 'all' && it.category !== filter) {
        // group some filters
        if (filter === 'animal_protein' && !['animal_protein', 'processed_protein'].includes(it.category)) return false;
        if (filter === 'oil' && !['oil', 'animal_fat'].includes(it.category)) return false;
        if (!['animal_protein', 'oil'].includes(filter)) return false;
      }
      if (!q) return true;
      return (
        it.canonicalKo.toLowerCase().includes(q) ||
        (it.canonicalEn || '').toLowerCase().includes(q) ||
        it.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [query, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '40px' }}>
      <Helmet>
        <title>성분사전 | 베로로</title>
        <meta name="description" content="사료 성분을 쉽게 검색하고 안전/주의 여부와 역할을 확인하세요." />
      </Helmet>

      {/* Intro */}
      <div style={{ padding: '16px 0 0' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' }}>성분사전</h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
          어려운 성분, 쉽게 풀어드려요. 안전 여부와 역할을 한눈에.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderRadius: 12, background: 'var(--fill)' }}>
          <SearchIcon size={18} stroke="var(--ink-faint)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={INGREDIENT_DICT.searchPlaceholder}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, color: 'var(--ink)', fontFamily: 'inherit' }}
          />
          {query && <X size={16} stroke="var(--ink-faint)" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />}
        </div>
      </div>

      {/* Category filters */}
      <div className="rail" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px', padding: '14px 20px 4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '8px 15px', borderRadius: 999, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 700,
              background: filter === key ? 'var(--ink)' : 'var(--fill)',
              color: filter === key ? '#fff' : 'var(--ink-soft)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ padding: '14px 0 8px', fontSize: 12.5, color: 'var(--ink-faint)', fontWeight: 600 }}>
        {results.length}개 성분
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {results.map((it) => {
          const sev = SEVERITY[it.defaultSeverity] || SEVERITY.safe;
          return (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 2px', background: 'none',
                border: 'none', borderBottom: '1px solid var(--hairline)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{it.canonicalKo}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)' }}>{CATEGORY_LABELS[it.category] || ''}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.explanation}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: sev.color, background: sev.bg, padding: '4px 9px', borderRadius: 8, flexShrink: 0 }}>
                {sev.label}
              </span>
            </button>
          );
        })}
        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-faint)', fontSize: 13, fontWeight: 600 }}>
            "{query}" 성분을 찾지 못했어요.<br />다른 이름으로 검색해 볼까요?
          </div>
        )}
      </div>

      {/* Detail bottom sheet */}
      {selected && createPortal(
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: '24px 24px 0 0', padding: '10px 20px 32px', animation: 'fadeInUp 0.25s ease' }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--hairline-strong)', margin: '0 auto 18px' }} />
            {(() => {
              const sev = SEVERITY[selected.defaultSeverity] || SEVERITY.safe;
              const tags = [...(selected.nutritionTags || []), ...(selected.riskTags || [])];
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{selected.canonicalKo}</div>
                      {selected.canonicalEn && <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontWeight: 600 }}>{selected.canonicalEn}</div>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sev.color, background: sev.bg, padding: '6px 13px', borderRadius: 10 }}>
                      {sev.label}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
                    {CATEGORY_LABELS[selected.category] || '성분'}
                  </div>

                  <p style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-soft)', fontWeight: 500 }}>
                    {selected.explanation}
                  </p>

                  {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
                      {tags.map((t) => (
                        <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', background: 'var(--fill)', padding: '5px 11px', borderRadius: 999 }}>
                          # {TAG_LABELS[t] || t}
                        </span>
                      ))}
                    </div>
                  )}

                  {selected.allergenTags?.length > 0 && (
                    <div style={{ marginTop: 18, padding: '13px 15px', borderRadius: 14, background: 'var(--danger-tint)' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--danger)' }}>알레르기 주의</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3, fontWeight: 500 }}>
                        {selected.allergenTags.map((t) => TAG_LABELS[t] || t).join(', ')} 알레르기가 있는 아이라면 확인이 필요해요.
                      </div>
                    </div>
                  )}

                  <p style={{ marginTop: 18, fontSize: 11.5, color: 'var(--ink-300)', lineHeight: 1.5 }}>
                    베로로의 성분사전은 참고 정보예요. 건강 상태에 따른 판단은 수의사와 상담하세요.
                  </p>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
