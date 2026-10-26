import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductRow from '../components/ProductRow';
import StateView from '../components/StateView';
import { useStore } from '../store/useStore';

export default function RecentProducts() {
  const navigate = useNavigate();
  const { recentViews, isLoadingRecentViews, recentViewsError, fetchRecentViews, userId } = useStore();

  useEffect(() => { void fetchRecentViews(); }, [fetchRecentViews, userId]);

  return (
    <section aria-label="최근 본 상품 목록" style={{ padding: '12px 0 24px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px' }}>
        최근에 본 순서로 표시합니다. 같은 상품을 다시 보면 맨 앞으로 이동합니다.
      </p>
      {isLoadingRecentViews ? <StateView variant="loading" title="최근 본 상품을 불러오는 중입니다" />
        : recentViewsError ? <StateView variant="error" title="최근 본 상품을 불러오지 못했습니다"
          description="연결을 확인한 뒤 다시 시도해 주세요." action={{ label: '다시 시도', onClick: () => void fetchRecentViews() }} />
          : recentViews.length === 0 ? <StateView title="최근 본 상품이 없습니다"
            description="제품을 살펴보시면 이곳에서 다시 확인할 수 있습니다."
            action={{ label: '제품 둘러보기', onClick: () => navigate('/search') }} />
            : <>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{recentViews.length}개 · 최근 본 순</p>
              <ol aria-label="최근 본 순" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentViews.map(product => <li key={product.id}><ProductRow product={product} /></li>)}
              </ol>
            </>}
    </section>
  );
}
