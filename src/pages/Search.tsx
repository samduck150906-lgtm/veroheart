import { useEffect, useState } from 'react';
import { Search as SearchIcon, Filter, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { searchProducts, getAllIngredients } from '../lib/supabase';

export default function Search() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    getAllIngredients().then(setAllIngredients);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchProducts(query, '전체', excludedIds);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, excludedIds]);

  const toggleExclude = (id: string) => {
    setExcludedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="animate-fade-in">
      <div style={{
        display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6',
        borderRadius: '16px', padding: '12px 20px', marginBottom: '16px',
        border: '1px solid #E5E7EB'
      }}>
        <SearchIcon size={20} className="text-gray-400" />
        <input 
          type="text" 
          placeholder="성분, 사료, 브랜드명 검색" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            width: '100%', marginLeft: '12px', fontSize: '16px', color: '#1F2937'
          }}
        />
        {query && <X size={18} className="text-gray-400 cursor-pointer" onClick={() => setQuery('')} />}
      </div>

      {/* 필터 섹션 */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            borderRadius: '20px', background: excludedIds.length > 0 ? '#EEF2FF' : '#fff',
            border: '1px solid #E5E7EB', fontSize: '14px', fontWeight: 600, color: excludedIds.length > 0 ? '#4F46E5' : '#4B5563'
          }}
        >
          <Filter size={16} /> 
          {excludedIds.length > 0 ? `제외 성분 ${excludedIds.length}개` : '성분 제외 필터'}
          <ChevronDown size={14} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>

        {isFilterOpen && (
          <div style={{ 
            marginTop: '12px', padding: '16px', background: '#fff', borderRadius: '16px',
            border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#1F2937' }}>제외할 성분 선택</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allIngredients.slice(0, 15).map(ing => (
                <div 
                  key={ing.id}
                  onClick={() => toggleExclude(ing.id)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: '1px solid #E5E7EB',
                    fontSize: '13px', cursor: 'pointer', transition: '0.2s',
                    background: excludedIds.includes(ing.id) ? '#FEE2E2' : '#F9FAFB',
                    color: excludedIds.includes(ing.id) ? '#B91C1C' : '#4B5563',
                    borderColor: excludedIds.includes(ing.id) ? '#FCA5A5' : '#E5E7EB',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {excludedIds.includes(ing.id) && <X size={12} />}
                  {ing.name_ko}
                </div>
              ))}
            </div>
            {excludedIds.length > 0 && (
              <button 
                onClick={() => setExcludedIds([])}
                style={{ marginTop: '16px', fontSize: '12px', color: '#EF4444', fontWeight: 600, background: 'none', border: 'none' }}
              >
                필터 초기화
              </button>
            )}
          </div>
        )}
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#1F2937', fontSize: '18px', fontWeight: 800 }}>
            검색 결과 ({searchResults.length})
          </h3>
          {isLoading && <div className="text-xs text-gray-400">불러오는 중...</div>}
        </div>

        {searchResults.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {searchResults.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          !isLoading && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '60px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
              <p>해당하는 제품을 찾을 수 없습니다.</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>검색어를 변경하거나 필터를 조정해보세요.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
