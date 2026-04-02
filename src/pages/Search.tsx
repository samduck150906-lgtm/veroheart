import { useEffect, useState } from 'react';
import {
  Search as SearchIcon,
  Filter,
  X,
  Check,
  Trash2,
  Utensils,
  Cookie,
  Pill,
  Sparkles,
  Droplets,
  Eye,
  Trash,
  Home,
  LayoutGrid,
  Plus,
  FlaskConical
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';

const MAIN_CATEGORIES = [
  { name: '전체', icon: LayoutGrid },
  { name: '사료', icon: Utensils },
  { name: '간식', icon: Cookie },
  { name: '영양제', icon: Pill },
  { name: '구강관리', icon: Sparkles },
  { name: '피부·목욕·위생', icon: Droplets },
  { name: '눈·귀·민감부위 케어', icon: Eye },
  { name: '배변/모래/패드', icon: Trash },
  { name: '생활용품·환경안전', icon: Home }
];



export default function Search() {
  const { profile } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    targetPetType: (profile?.species?.toLowerCase() as 'dog' | 'cat' | 'all') || 'dog',
    targetLifeStage: '',
    formulation: '',
    subCategory: '',
    healthConcerns: [] as string[]
  });

  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [allIngredients, setAllIngredients] = useState<{ id: string; name_ko: string; risk_level: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');

  useEffect(() => {
    getAllIngredients().then(setAllIngredients);
  }, []);

  const filteredIngList = allIngredients.filter(i =>
    i.name_ko.includes(ingredientSearch) && !excludedIngredients.includes(i.name_ko)
  ).slice(0, 20);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchProducts(query, category, excludedIngredients, {
          targetPetType: filters.targetPetType,
          targetLifeStage: filters.targetLifeStage || undefined,
          formulation: filters.formulation || undefined,
          subCategory: filters.subCategory || undefined,
          healthConcerns: filters.healthConcerns
        });
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, category, filters, excludedIngredients]);

  const toggleHealthConcern = (concern: string) => {
    setFilters(prev => ({
      ...prev,
      healthConcerns: prev.healthConcerns.includes(concern)
        ? prev.healthConcerns.filter(c => c !== concern)
        : [...prev.healthConcerns, concern]
    }));
  };

  const resetFilters = () => {
    setFilters({
      targetPetType: (profile?.species?.toLowerCase() as 'dog' | 'cat' | 'all') || 'dog',
      targetLifeStage: '',
      formulation: '',
      subCategory: '',
      healthConcerns: []
    });
    setExcludedIngredients([]);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      {/* Search Header */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10, padding: '12px 0' }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6',
          borderRadius: '16px', padding: '12px 20px', marginBottom: '16px',
          border: '1px solid #E5E7EB'
        }}>
          <SearchIcon size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="상품명, 브랜드, 성분을 입력하세요" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              width: '100%', marginLeft: '12px', fontSize: '16px', color: '#1F2937'
            }}
          />
          {query && <X size={18} className="text-gray-400 cursor-pointer" onClick={() => setQuery('')} />}
          <button onClick={() => setIsFilterOpen(true)} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: (filters.healthConcerns.length > 0 || filters.subCategory || excludedIngredients.length > 0) ? 'var(--primary)' : '#6B7280' }}>
            <Filter size={20} />
          </button>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {MAIN_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => {
                setCategory(cat.name);
                setFilters(f => ({ ...f, subCategory: '' }));
              }}
              style={{
                padding: '10px 18px', borderRadius: '24px', fontSize: '14px', whiteSpace: 'nowrap',
                border: category === cat.name ? 'none' : '1px solid #E5E7EB',
                backgroundColor: category === cat.name ? 'var(--primary-dark)' : '#fff',
                color: category === cat.name ? '#fff' : '#4B5563',
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280' }}>총 <strong style={{ color: '#111827' }}>{searchResults.length}</strong>개의 상품</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {searchResults.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {searchResults.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {isFilterOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="animate-slide-in-right" style={{ width: '85%', maxWidth: '400px', backgroundColor: '#fff', height: '100%', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>상세 필터</h2>
              <button onClick={() => setIsFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <Section title="반려동물">
              <div style={{ display: 'flex', gap: '8px' }}>
                {['dog', 'cat', 'all'].map(type => (
                  <FilterChip key={type} label={type === 'dog' ? '강아지' : type === 'cat' ? '고양이' : '공용'} selected={filters.targetPetType === type} onClick={() => setFilters({...filters, targetPetType: type as any})} />
                ))}
              </div>
            </Section>

            <Section title="생애주기">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['퍼피·키튼', '성체', '시니어'].map(stage => (
                  <FilterChip key={stage} label={stage} selected={filters.targetLifeStage === stage} onClick={() => setFilters({...filters, targetLifeStage: filters.targetLifeStage === stage ? '' : stage})} />
                ))}
              </div>
            </Section>

            <Section title="건강 고민">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['알레르기', '눈물', '관절', '신장', '요로', '피부', '구강', '비만'].map(concern => (
                  <FilterChip key={concern} label={concern} selected={filters.healthConcerns.includes(concern)} onClick={() => toggleHealthConcern(concern)} />
                ))}
              </div>
            </Section>

            <Section title="성분 제외 필터">
              {excludedIngredients.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {excludedIngredients.map(name => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#FEF2F2', borderRadius: '20px', border: '1px solid #FECACA' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>{name}</span>
                      <button onClick={() => setExcludedIngredients(prev => prev.filter(i => i !== name))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#EF4444', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <FlaskConical size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="제외할 성분 검색..."
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {ingredientSearch && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#fff' }}>
                  {filteredIngList.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>검색 결과 없음</div>
                  ) : filteredIngList.map(ing => (
                    <button
                      key={ing.id}
                      onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', borderBottom: '1px solid #F3F4F6' }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ing.risk_level === 'danger' ? '#EF4444' : ing.risk_level === 'caution' ? '#F59E0B' : '#10B981', flexShrink: 0 }} />
                      {ing.name_ko}
                      <Plus size={14} style={{ marginLeft: 'auto', color: '#9CA3AF' }} />
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>선택한 성분이 포함된 제품은 검색에서 제외됩니다.</p>
            </Section>

            {/* Bottom Buttons */}
            <div style={{ position: 'sticky', bottom: 0, paddingTop: '40px', paddingBottom: '24px', backgroundColor: '#fff', display: 'flex', gap: '12px' }}>
              <button onClick={resetFilters} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700 }}><Trash2 size={18} /> 초기화</button>
              <button onClick={() => setIsFilterOpen(false)} style={{ flex: 2, padding: '18px', borderRadius: '16px', backgroundColor: '#111827', color: '#fff', fontWeight: 800 }}>적용하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: '#1F2937' }}>{title}</h3>
      {children}
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px', borderRadius: '24px', fontSize: '14px', border: '1px solid',
        borderColor: selected ? 'var(--primary)' : '#E5E7EB',
        backgroundColor: selected ? 'var(--primary)' : 'transparent',
        color: selected ? '#fff' : '#4B5563', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '4px'
      }}
    >
      {selected && <Check size={16} />}
      {label}
    </button>
  );
}
