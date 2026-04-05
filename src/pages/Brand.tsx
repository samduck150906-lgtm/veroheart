import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Store, Package, Star, MessageSquare, Sparkles } from 'lucide-react';
import { getProductsByBrand, getBrands } from '../lib/supabase';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

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

      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#374151', fontWeight: 700 }}>
        <ArrowLeft size={20} /> 뒤로
      </button>

      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '22px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
          <Store size={13} />
          brand focus
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="ui-icon-pill" style={{ width: '58px', height: '58px' }}>
              <Store size={26} color="var(--primary-dark)" />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '4px' }}>{decoded}</h1>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>리뷰와 성분 흐름을 한 번에 보는 브랜드 페이지</p>
            </div>
          </div>
        </div>
        <div className="ui-grid-3">
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><Package size={16} color="var(--primary-dark)" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>등록 제품</div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>{brandProducts.length}</div>
          </div>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><Star size={16} color="#F59E0B" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>평균 평점</div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>
              {brandProducts.length > 0
                ? (brandProducts.reduce((a, p) => a + (p.averageRating || 0), 0) / brandProducts.length).toFixed(1)
                : '-'}
            </div>
          </div>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><MessageSquare size={16} color="#3B82F6" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>총 리뷰 수</div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>
              {brandProducts.reduce((a, p) => a + (p.reviewsCount || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <div className="ui-info-card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <div>
            <div className="ui-section-kicker">brand snapshot</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', marginTop: '2px' }}>
              이 브랜드의 제품군을 비교해보세요
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="ui-badge ui-badge-soft">
            <Sparkles size={12} />
            리뷰 기반 탐색
          </span>
          <span className="ui-badge ui-badge-muted">브랜드별 제품 모아보기</span>
          <span className="ui-badge ui-badge-muted">상세로 바로 이동</span>
        </div>
      </div>

      <section style={{ marginBottom: '40px' }}>
        <div className="ui-section-head">
          <div>
            <div className="ui-section-kicker">product lineup</div>
            <h2 className="ui-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} /> 전체 제품 ({brandProducts.length})
            </h2>
          </div>
        </div>
        {isLoading ? (
          <div className="ui-info-card" style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>불러오는 중...</div>
        ) : brandProducts.length === 0 ? (
          <div className="ui-info-card" style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
            등록된 제품이 없습니다.
          </div>
        ) : (
          <div className="ui-grid-2">
            {brandProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {displayOtherBrands.length > 0 && (
        <section>
          <div className="ui-section-head">
            <div>
              <div className="ui-section-kicker">other brands</div>
              <h2 className="ui-section-title">다른 브랜드 둘러보기</h2>
            </div>
          </div>
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
