// @ts-nocheck
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { Search as SearchIcon, X, ChevronRight } from 'lucide-react';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';
import { INGREDIENT_DICT } from '../copy/ui';

const FILTER_CATS = ['전체', '방부제', '단백질원', '탄수화물', '미네랄', '비타민'];

const RISK_COLORS = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const RISK_LABEL = { safe: '안전', caution: '주의', danger: '위험' };

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '방부제': ['BHA', 'BHT', '에톡시퀸', '방부', 'preservative'],
  '단백질원': ['고기', '살', '분말', 'protein', 'meal', '계육', '어분', '오리', '연어', '소고기', '닭'],
  '탄수화물': ['쌀', '감자', '고구마', '옥수수', '밀', '귀리', 'rice', 'potato', 'corn'],
  '미네랄': ['칼슘', '인', '철', '아연', '마그네슘', '망간', 'calcium', 'phosphorus', 'zinc'],
  '비타민': ['비타민', 'vitamin', '비오틴', '엽산', '콜린'],
};

function categorize(ing: any): string {
  const name = (ing.name_ko || '') + (ing.name_en || '');
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))) return cat;
  }
  return '기타';
}

export default function IngredientDictionary() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchIngredients() {
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('id, name_ko, name_en, risk_level, description, functional_benefit, allergen_group')
          .order('name_ko');
        if (!error && data) setIngredients(data);
      } catch (err) {
        console.error('ingredients fetch error', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchIngredients();
  }, []);

  const filtered = useMemo(() => {
    return ingredients.filter(ing => {
      if (activeFilter !== '전체') {
        const cat = categorize(ing);
        if (cat !== activeFilter) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!(ing.name_ko || '').toLowerCase().includes(q) && !(ing.name_en || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ingredients, activeFilter, query]);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>성분사전</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 14 }}>사료 성분을 쉽게 이해하세요</p>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 14, padding: '0 16px',
          boxShadow: '0 1px 4px rgba(30,41,59,0.08)', marginBottom: 14,
        }}>
          <SearchIcon size={17} color="#8B95A1" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={INGREDIENT_DICT.searchPlaceholder}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, color: 'var(--ink)', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B95A1', fontSize: 16 }}>✕</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {FILTER_CATS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${activeFilter === f ? '#F5C518' : '#E5E8EB'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: activeFilter === f ? '#FEF6E0' : '#fff',
                color: activeFilter === f ? '#CA8A04' : '#6B7684',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#B0B8C1' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ fontWeight: 600 }}>성분 정보를 불러오는 중...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#B0B8C1' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 600 }}>검색 결과가 없어요</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>다른 성분명으로 검색해보세요</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#8B95A1', fontWeight: 600, marginBottom: 2 }}>
            총 {filtered.length}개 성분
          </div>
          {filtered.map(ing => {
            const risk = ing.risk_level || 'safe';
            const cat = categorize(ing);
            return (
              <div key={ing.id} style={{
                background: '#fff', borderRadius: 18, padding: '16px 18px',
                boxShadow: '0 1px 6px rgba(30,41,59,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>{ing.name_ko}</span>
                      <span style={{
                        background: RISK_BG[risk], color: RISK_COLORS[risk],
                        borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 800,
                      }}>{RISK_LABEL[risk]}</span>
                    </div>
                    {ing.name_en && (
                      <div style={{ fontSize: 12, color: '#8B95A1', fontWeight: 500 }}>{ing.name_en}</div>
                    )}
                  </div>
                  <span style={{
                    background: '#F7F4EE', color: '#6B7684', borderRadius: 8, padding: '3px 8px',
                    fontSize: 11, fontWeight: 600, flexShrink: 0, marginLeft: 8,
                  }}>{cat}</span>
                </div>
                {ing.description && (
                  <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.6, marginBottom: ing.functional_benefit ? 8 : 0 }}>
                    {ing.description}
                  </p>
                )}
                {ing.functional_benefit && (
                  <div style={{ background: '#F7F4EE', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#4E5968', fontWeight: 600 }}>
                    💡 {ing.functional_benefit}
                  </div>
                )}
                {ing.allergen_group && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#E8A800', fontWeight: 700 }}>
                    ⚠️ 알러지 그룹: {ing.allergen_group}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
