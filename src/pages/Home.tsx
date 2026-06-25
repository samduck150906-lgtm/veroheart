// @ts-nocheck
// CHANGED: 홈 전면 재디자인 — 상세페이지와 통일된 Tailwind 디자인 시스템(크림 #FAF8F4 / 브랜드 옐로 #F5C842
// / 그린 #2ECC71)으로 재작성. 데이터 fetch/상태 로직은 그대로 유지하고, 데이터 미로딩 시 큰 공백이
// 생기던 문제를 로딩 스켈레톤 + 빈 상태 카드로 해결. 모바일 우선(max-width 480px).
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Heart } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { rankProductsForProfile } from '../utils/score';
import { getDisplayGrade } from '../utils/productGrade';
import { displayBrand } from '../utils/brandLabel';

// 등급→색상 매핑 (상세페이지와 동일 점수 팔레트). 알 수 없는 등급은 중립 회색.
const getGradeColor = (grade) => {
  const map = { S: '#2ECC71', A: '#A8E063', B: '#F5C842', C: '#FF9F43', D: '#EE5A24' };
  return map[grade] ?? '#ABABAB';
};

const CATEGORY_CHIPS = [
  { icon: '🥣', label: '사료', category: '사료' },
  { icon: '🦴', label: '간식', category: '간식' },
  { icon: '💊', label: '영양제', category: '영양제' },
  { icon: '🦷', label: '구강', category: '구강관리' },
  { icon: '🛁', label: '피부·목욕', category: '피부·목욕·위생' },
  { icon: '👁', label: '눈·귀', category: '눈·귀·민감부위 케어' },
  { icon: '🪣', label: '배변', category: '배변/모래/패드' },
  { icon: '🏠', label: '생활용품', category: '생활용품·환경안전' },
];

// CHANGED: 데이터 로딩 중 큰 공백 대신 보여줄 스켈레톤 카드 (문제: 데이터 미로딩 시 가운데 공백)
function SkeletonCard() {
  return (
    <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="aspect-square bg-[#F0EFEC] animate-pulse" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-2.5 w-1/3 bg-[#F0EFEC] rounded animate-pulse" />
        <div className="h-3 w-full bg-[#F0EFEC] rounded animate-pulse" />
        <div className="h-3.5 w-1/2 bg-[#F0EFEC] rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  // 데이터/상태 로직 유지. 로딩 스켈레톤을 위해 isLoadingProducts도 구독.
  const { products, profile, recentViews, isLoggedIn, favorites, toggleFavorite, isLoadingProducts } = useStore();

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  const petName = hasPetProfile ? profile.name : null;

  // 식단 건강 점수 (기존 로직 유지)
  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  // 맞춤 추천 상품 (기존 랭킹 로직 유지)
  const topRanked = useMemo(() => {
    if (!products.length) return [];
    if (hasPetProfile) {
      return rankProductsForProfile(products, profile, { limit: 6 }).map((r) => r.product);
    }
    return [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6);
  }, [products, profile, hasPetProfile]);

  // 인기 TOP 3 — 평점순 상위 3개
  const rankingTop3 = useMemo(
    () => [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3),
    [products],
  );

  // 최근 본 상품 (기존 로직 유지)
  const recentList = useMemo(
    () => (recentViews?.length ? recentViews : []),
    [recentViews],
  );

  const gradeInfoOf = (product) => getDisplayGrade(product, profile, hasPetProfile);
  const favoriteSet = new Set(favorites || []);
  const loading = isLoadingProducts && products.length === 0;
  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    // veroro-home: preflight 미사용 환경에서 border/divide 유틸이 동작하도록 하는 스코프 클래스.
    <div className="veroro-home bg-[#FAF8F4] min-h-screen pb-24">

      {/* ===== 검색 바 ===== */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-2.5 bg-white border border-[#EFEFEF] rounded-full px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,0.04)] text-left active:bg-[#FAFAF8] transition-colors"
        >
          <Search size={18} className="text-[#ABABAB]" />
          <span className="text-[14px] text-[#ABABAB]">사료·간식·브랜드를 검색해보세요</span>
        </button>
      </div>

      {/* ===== [섹션 1] 히어로 ===== */}
      {hasPetProfile ? (
        <button
          onClick={() => navigate('/pet-profile')}
          className="mx-4 mt-3 mb-1 w-[calc(100%-2rem)] rounded-[20px] p-5 relative overflow-hidden text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)' }}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute right-6 -bottom-10 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-4xl flex-shrink-0">
              {profile?.species === 'Cat' ? '🐱' : '🐕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/85 truncate">{petName} 보호자님, 안녕하세요</p>
              <p className="text-[17px] font-extrabold text-white leading-snug mb-1.5">오늘도 건강한 한 끼 챙겨요</p>
              <span className="inline-flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-full text-[12px] font-extrabold text-[#C98A00]">
                식단 적합도 {healthScore}점
              </span>
            </div>
            <ChevronRight size={22} className="text-white/90 flex-shrink-0" />
          </div>
        </button>
      ) : (
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          className="mx-4 mt-3 mb-1 w-[calc(100%-2rem)] rounded-[20px] overflow-hidden relative block text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)', minHeight: 148 }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative p-5">
            <p className="text-[12px] font-semibold text-white/75 mb-1">AI 사료 성분 분석</p>
            <p className="text-[21px] font-extrabold text-white leading-snug mb-3">
              내 아이에게 딱 맞는<br />사료를 찾아드려요 🐾
            </p>
            <span className="inline-block bg-white text-[#F0A500] text-[13px] font-bold px-4 py-2 rounded-full shadow-sm">
              반려동물 등록하기 →
            </span>
          </div>
          <div className="absolute right-5 bottom-3 text-[64px] leading-none opacity-90 pointer-events-none">🐶</div>
        </button>
      )}

      {/* ===== [섹션 2] 빠른 카테고리 ===== */}
      <div className="mt-4 mb-1">
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_CHIPS.map(({ icon, label, category }) => (
            <button
              key={label}
              onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-[#EFEFEF] rounded-full px-3.5 py-2 text-[13px] font-medium text-[#1A1A1A] shadow-[0_1px_4px_rgba(0,0,0,0.05)] active:bg-[#FEF9E7] active:border-[#F5C842] transition-colors"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== [섹션 3] 맞춤 추천 (로딩 스켈레톤 / 빈 상태 처리) ===== */}
      <section className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[17px] font-extrabold text-[#1A1A1A]">
              {petName ? `${petName}에게 잘 맞을 것 같아요` : '추천 사료 모아봤어요'}
            </p>
            <p className="text-[12px] text-[#ABABAB] mt-0.5">
              {petName ? 'AI가 분석한 맞춤 추천이에요' : '인기 있는 사료부터 확인해보세요'}
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="text-[13px] font-medium text-[#ABABAB] flex items-center gap-0.5 flex-shrink-0"
          >
            전체보기 <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : topRanked.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {topRanked.slice(0, 6).map((product) => {
              const { grade, label } = gradeInfoOf(product);
              const isFav = favoriteSet.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="relative bg-[#F8F8F8] aspect-square">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                      style={{ background: getGradeColor(grade) }}
                    >
                      {label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                      aria-label="찜하기"
                      className="absolute top-2 right-2 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Heart size={14} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#9A9A9A'} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-[#ABABAB] mb-0.5 truncate">{displayBrand(product.brand, product.name)}</p>
                    <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug line-clamp-2 mb-1.5 min-h-[34px]">
                      {product.name}
                    </p>
                    <p className="text-[15px] font-extrabold text-[#1A1A1A]">
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // 빈 상태 — 큰 공백 대신 검색 유도 카드
          <div className="bg-white rounded-[16px] p-7 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">추천할 사료를 준비 중이에요</p>
            <p className="text-[12px] text-[#ABABAB] mb-4">원하는 사료를 직접 검색해보세요</p>
            <button
              onClick={() => navigate('/search')}
              className="bg-[#F5C842] rounded-[10px] px-5 py-2.5 text-[13px] font-bold text-white active:bg-[#F0A500] transition-colors"
            >
              사료 검색하기
            </button>
          </div>
        )}
      </section>

      {/* ===== [섹션 4] 인기 TOP 3 ===== */}
      {(loading || rankingTop3.length > 0) && (
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[17px] font-extrabold text-[#1A1A1A]">🏆 이번 주 인기 TOP 3</p>
            <button onClick={() => navigate('/ranking')} className="text-[13px] font-medium text-[#ABABAB] flex items-center gap-0.5">
              랭킹 전체 <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] divide-y divide-[#F2F2F2]">
            {loading
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5">
                    <div className="w-6 h-6 bg-[#F0EFEC] rounded-full animate-pulse flex-shrink-0" />
                    <div className="w-12 h-12 bg-[#F0EFEC] rounded-[10px] animate-pulse flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-3 w-2/3 bg-[#F0EFEC] rounded animate-pulse" />
                      <div className="h-3 w-1/3 bg-[#F0EFEC] rounded animate-pulse" />
                    </div>
                  </div>
                ))
              : rankingTop3.map((product, index) => {
                  const { grade } = gradeInfoOf(product);
                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="flex items-center gap-3 p-3.5 active:bg-[#FAF8F4] cursor-pointer"
                    >
                      <span className="w-6 text-center text-[18px] flex-shrink-0">{MEDALS[index]}</span>
                      <div className="w-12 h-12 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden">
                        <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{product.name}</p>
                        <p className="text-[12px] text-[#ABABAB]">
                          {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-bold text-white px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: getGradeColor(grade) }}
                      >
                        {grade === 'pending' ? '분석 중' : `${grade}등급`}
                      </span>
                    </div>
                  );
                })}
          </div>
        </section>
      )}

      {/* ===== [섹션 5] 최근 본 상품 (데이터 있을 때만) ===== */}
      {recentList.length > 0 && (
        <section className="mt-6 px-4 mb-2">
          <p className="text-[17px] font-extrabold text-[#1A1A1A] mb-3">최근 본 상품</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentList.slice(0, 8).map((product) => {
              const { grade } = gradeInfoOf(product);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="flex-shrink-0 w-[120px] bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="relative bg-[#F8F8F8] h-[100px]">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    <span
                      className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
                      style={{ background: getGradeColor(grade) }}
                    >
                      {grade === 'pending' ? '분석 중' : grade}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-[#1A1A1A] font-medium leading-snug line-clamp-2 mb-1 min-h-[28px]">
                      {product.name}
                    </p>
                    <p className="text-[12px] font-extrabold text-[#1A1A1A]">
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
