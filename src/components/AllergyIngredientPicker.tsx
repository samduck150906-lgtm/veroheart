import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getAllIngredients } from '../lib/supabase';
import { COMMON_ALLERGY_SUGGESTIONS, rankAllergyCandidates } from '../utils/allergyPicker';

interface AllergyIngredientPickerProps {
  /** 선택된 회피 성분 이름 목록. */
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * 회피 성분(알레르기) 선택 — 성분 DB 검색 기반.
 *
 * 예전에는 고정 선택지 5개(닭고기·소고기·연어·곡물·인공색소)뿐이라 오리·칠면조·달걀처럼
 * 흔한 알레르겐조차 고를 수 없었다. 이제 서비스가 가진 성분 사전을 검색해서 고른다.
 *
 * 자유 입력을 앞세우지 않는 이유: 분석 엔진은 성분명을 정규화해서 매칭하는데,
 * 임의 문자열이 늘어나면 어디에도 걸리지 않는 값이 쌓인다. 사전에 있는 이름을 고르면
 * 그대로 매칭에 쓰인다.
 */
export default function AllergyIngredientPicker({ selected, onChange }: AllergyIngredientPickerProps) {
  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState<{ id: string; name_ko: string; risk_level: string }[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllIngredients()
      .then((rows) => { if (!cancelled) setIngredients(rows); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(
    () => rankAllergyCandidates(query, ingredients.map((i) => i.name_ko), selected),
    [query, ingredients, selected],
  );

  const add = (name: string) => {
    if (!selected.includes(name)) onChange([...selected, name]);
    setQuery('');
  };
  const remove = (name: string) => onChange(selected.filter((n) => n !== name));

  const trimmed = query.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => remove(name)}
              aria-label={`${name} 회피 성분에서 빼기`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 12px 9px 14px', borderRadius: '999px', border: 'none',
                background: 'var(--danger-strong)', color: '#fff',
                fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {name}
              <X size={14} aria-hidden />
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          background: 'var(--surface-alt)', borderRadius: '12px', padding: '12px 14px',
        }}
      >
        <Search size={17} color="var(--text-muted)" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="피해야 하는 음식이나 성분을 검색하세요"
          aria-label="회피 성분 검색"
          style={{
            border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: 0,
            fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)',
          }}
        />
      </div>

      {trimmed === '' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {COMMON_ALLERGY_SUGGESTIONS.filter((name) => !selected.includes(name)).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              style={{
                padding: '9px 14px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 600,
                border: '1px solid var(--line)', background: 'var(--surface-elevated)',
                color: 'var(--text-dark)', cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {trimmed !== '' && (
        results.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {results.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => add(name)}
                style={{
                  padding: '9px 14px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 600,
                  border: '1px solid var(--line)', background: 'var(--surface-elevated)',
                  color: 'var(--text-dark)', cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {loadFailed
              ? '성분 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
              : `'${trimmed}' 와 맞는 성분을 찾지 못했어요. 다른 이름으로 검색해 보세요.`}
          </p>
        )
      )}
    </div>
  );
}
