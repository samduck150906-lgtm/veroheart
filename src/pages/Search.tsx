import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { mockProducts } from '../data/mock';
import ProductCard from '../components/ProductCard';

export default function Search() {
  const [query, setQuery] = useState('');
  
  const results = mockProducts.filter(p => 
    p.name.includes(query) || p.brand.includes(query) || 
    p.ingredients.some(i => i.nameKo.includes(query))
  );

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)',
        borderRadius: '12px', padding: '12px 16px', marginBottom: '24px'
      }}>
        <SearchIcon size={20} color="var(--text-light)" />
        <input 
          type="text" 
          placeholder="성분, 사료, 브랜드명 검색" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            width: '100%', marginLeft: '12px', fontSize: '16px'
          }}
        />
      </div>
      
      <div>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-dark)', fontSize: '18px' }}>
          검색 결과 ({results.length})
        </h3>
        {results.length > 0 ? (
          results.map(p => <ProductCard key={p.id} product={p} />)
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 0' }}>
            결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
