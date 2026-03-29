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
  LayoutGrid 
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

const CATEGORY_MAP: Record<string, string[]> = {
  '사료': ['주식 사료', '건식사료', '습식사료', '세미모이스트', '생식', '동결건조 사료', '처방식/기능성 사료'],
  '간식': ['저키', '트릿', '동결건조 간식', '껌', '비스킷', '캔/파우치 간식', '츄르/액상 간식', '퓨어미트/토퍼'],
  '영양제': ['종합영양제', '유산균/장 건강', '관절 건강', '피부/피모', '눈 건강', '신장 건강', '요로 건강', '심장 건강', '면역', '진정/스트레스 케어', '구강 건강', '오메가3/오일'],
  '구강관리': ['치약', '치약젤', '구강스프레이', '덴탈껌', '덴탈파우더'],
  '피부·목욕·위생': ['샴푸', '린스', '미스트', '보습제', '밤/크림', '탈취제'],
  '눈·귀·민감부위 케어': ['귀 세정제', '눈 세정제', '코밤/코보습제'],
  '배변/모래/패드': ['고양이 모래', '배변패드', '매너벨트/기저귀'],
  '생활용품·환경안전': ['장난감', '식기/급수기', '세탁세제', '소독제']
};

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

  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);

  useEffect(() => {
    getAllIngredients().then(setAllIngredients);
  }, []);

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
