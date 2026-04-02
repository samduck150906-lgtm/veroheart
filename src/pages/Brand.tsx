import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Store, Package } from 'lucide-react';
import { getProductsByBrand, getBrands } from '../lib/supabase';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import type { Product } from '../data/mock';

export default function Brand() {
  const { brandName } = useParams<{ brandName: string }>();
  const navigate = useNavigate();
  const { products } = useStore();
  const decoded = decodeURIComponent(brandName || '');

  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [otherBrands, setOtherBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!decoded) return;
    setIsLoading(true);
    Promise.all([
      getProductsByBrand(decoded),
      getBrands()
    ]).then(([prods, brands]) => {
      // Fallback to in-memory products if DB returns nothing
      const result = prods.length > 0
        ? prods
        : products.filter(p => p.brand === decoded);
      setBrandProducts(result);
      setOtherBrands(brands.filter(b => b !== decoded).slice(0, 10));
      setIsLoading(false);
    });
  }, [decoded, products]);

  const allBrands = [...new Set(products.map(p => p.brand))].filter(Boolean);
  const displayOtherBrands = otherBrands.length > 0 ? otherBrands : allBrands.filter(b => b !== decoded).slice(0, 10);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <Helmet><title>{decoded} - 베로로</title></Helmet>

      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#374151', fontWeight: 600 }}>
        <ArrowLeft size={20} /> 뒤로
      </button>

      {/* 브랜드 헤더 */}
      <div style={{ padding: '28px 24px', background: '#111827', borderRadius: '24px', marginBottom: '28px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900 }}>{decoded}</h1>
            <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px' }}>공식 브랜드 페이지</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900 }}>{brandProducts.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>등록 제품</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900 }}>
              {brandProducts.length > 0
                ? (brandProducts.reduce((a, p) => a + (p.averageRating || 0), 0) / brandProducts.length).toFixed(1)
                : '-'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>평균 평점</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 900 }}>
              {brandProducts.reduce((a, p) => a + (p.reviewsCount || 0), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>총 리뷰 수</div>
          </div>
        </div>
      </div>

      {/* 제품 목록 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} /> 전체 제품 ({brandProducts.length})
        </h2>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>불러오는 중...</div>
        ) : brandProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '16px' }}>
            등록된 제품이 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {brandProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* 다른 브랜드 */}
      {displayOtherBrands.length > 0 && (
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>다른 브랜드</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {displayOtherBrands.map(brand => (
              <button key={brand} onClick={() => navigate(`/brand/${encodeURIComponent(brand)}`)} style={{
                padding: '10px 18px', borderRadius: '24px', border: '1px solid #E5E7EB',
                background: '#fff', color: '#374151', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                {brand}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
