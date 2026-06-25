// @ts-nocheck
// CHANGED: 홈 전면 리뉴얼 — 인라인 스타일 + 중복 카테고리/깨진 추천 제목 등 문제를 제거하고
// Tailwind 기반 모바일 우선(max-width 480px) UI로 재작성. 데이터 fetch/상태 로직은 그대로 유지.
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { rankProductsForProfile, gradeFromScore, calculateCompatibilityScore } from '../utils/score';

// CHANGED: 등급→색상 매핑 유틸 추가 (상세페이지와 통일된 점수 팔레트). 알 수 없는 등급은 중립 회색.
const getGradeColor = (grade) => {
  const map = { S: '#2ECC71', A: '#A8E063', B: '#F5C842', C: '#FF9F43', D: '#EE5A24' };
  return map[grade] ?? '#ABABAB';
};

// CHANGED: 중복으로 두 번 노출되던 4x2 카테고리 그리드를 제거하고, 단일 가로 스크롤 칩 한 줄로 통합 (문제 #1).
// label/emoji는 명세 디자인을, category(검색 라우팅 값)는 기존 검색 카테고리 체계를 그대로 사용.
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

export default function Home() {
  const navigate = useNavigate();
  // CHANGED: 데이터/상태 로직 유지. 찜 버튼 동작을 위해 store의 toggleFavorite만 추가로 구독.
  const { products, profile, recentViews, isLoggedIn, favorites, toggleFavorite } = useStore();

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  // CHANGED: 로그인/등록 안 된 경우 petName을 null로 두고, 출력부에서 조건 처리해 "null에게..." 버그 방지 (문제 #3).
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
    if (!products.length) return products.slice(0, 6);
    if (hasPetProfile) {
      return rankProductsForProfile(products, profile, { limit: 6 });
    }
    return [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6);
  }, [products, profile, hasPetProfile]);

  // CHANGED: 인기 TOP 랭킹 미리보기(신규 섹션, 문제 #4)용 데이터 — 평점순 상위 3개. 기존 products 상태만 사용.
  const rankingTop3 = useMemo(
    () => [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3),
    [products],
  );

  // 최근 본 상품 (기존 로직 유지)
  const recentList = useMemo(
    () => (recentViews?.length ? recentViews : products.slice(0, 6)),
    [recentViews, products],
  );

  // 등급 산출 (기존 규칙 유지: 프로필 있으면 궁합점수 기반, 없으면 검수상태 기반 기본값)
  const gradeOf = (product) =>
    hasPetProfile
      ? gradeFromScore(calculateCompatibilityScore(product, profile))
      : product.verificationStatus === 'verified'
        ? 'A'
        : 'B';

  const favoriteSet = new Set(favorites || []);

  return (
    // CHANGED: 페이지 배경을 명세 크림 토큰(#FAF8F4)으로 통일, 하단 네비 여백 확보 (문제 #10).
    // veroro-home: preflight 미사용 환경에서 border/divide 유틸이 동작하도록 하는 스코프 클래스.
    <div className="veroro-home bg-[#FAF8F4] min-h-screen pb-24">

      {/* ===== [섹션 1] 히어로 배너 (문제 #2, #9) ===== */}
      {hasPetProfile ? (
        // CHANGED: 로그인+반려동물 등록 완료 — 흰 카드형 히어로. 기존 식단 적합도(healthScore)는 칩으로 보존.
        <button
          onClick={() => navigate('/pet-profile')}
          className="mx-4 mt-4 mb-2 bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#FEF9E7] flex items-center justify-center text-3xl flex-shrink-0">
            {profile?.species === 'Cat' ? '🐱' : '🐕'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#ABABAB]">안녕하세요!</p>
            <p className="text-[16px] font-bold text-[#1A1A1A] truncate">{petName}에게 맞는 사료</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-[#2ECC71] bg-[#EAFAF1] px-2 py-0.5 rounded-full">
                식단 적합도 {healthScore}
              </span>
              <span className="text-[12px] text-[#6B6B6B] truncate">맞춤 추천 확인</span>
            </div>
          </div>
          <span className="text-[#ABABAB] text-xl flex-shrink-0">›</span>
        </button>
      ) : (
        // CHANGED: 비로그인 — 밋밋한 노란 배너를 그라데이션+배경 장식원+일러스트+CTA 히어로로 교체 (문제 #2, #9).
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          className="mx-4 mt-4 mb-2 rounded-[20px] overflow-hidden relative block text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)', minHeight: 140 }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative p-5">
            <p className="text-[12px] font-semibold text-white/70 mb-1">AI 성분 분석 앱</p>
            <p className="text-[20px] font-extrabold text-white leading-snug mb-3">
              내 아이에게 딱 맞는<br />사료를 찾아드려요 🐾
            </p>
            <span className="inline-block bg-white text-[#F0A500] text-[13px] font-bold px-4 py-2 rounded-full shadow-sm">
              반려동물 등록하기 →
            </span>
          </div>
          <div className="absolute right-5 bottom-4 text-[64px] leading-none opacity-90 pointer-events-none">🐶</div>
        </button>
      )}

      {/* ===== [섹션 2] 빠른 카테고리 — 가로 스크롤 칩 한 줄 (문제 #1) ===== */}
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

      {/* ===== [섹션 3] 맞춤 추천 상품 (문제 #3, #4, #5) ===== */}
      {topRanked.length > 0 && (
        <section className="mt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              {/* CHANGED: HOME.sectionRecommended(null) → "null에게..." 버그를, petName 조건부 출력으로 수정 (문제 #3). */}
              <p className="text-[17px] font-bold text-[#1A1A1A]">
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
              전체보기 <span>›</span>
            </button>
          </div>

          {/* CHANGED: 작은 이미지/약한 outline 버튼 카드를, 1:1 이미지 + 채워진 비교 버튼 2열 그리드로 교체 (문제 #4, #5). */}
          <div className="grid grid-cols-2 gap-3">
            {topRanked.slice(0, 6).map((product) => {
              const grade = gradeOf(product);
              const isFav = favoriteSet.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  {/* 이미지 영역 (1:1) */}
                  <div className="relative bg-[#F8F8F8] aspect-square">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain p-3"
                    />
                    <span
                      className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                      style={{ background: getGradeColor(grade) }}
                    >
                      {grade}등급
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                      aria-label="찜하기"
                      className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-sm"
                      style={{ color: isFav ? '#F04452' : '#1A1A1A' }}
                    >
                      {isFav ? '♥' : '♡'}
                    </button>
                  </div>

                  {/* 정보 영역 */}
                  <div className="p-3">
                    <p className="text-[10px] text-[#ABABAB] mb-0.5 truncate">{product.brand}</p>
                    <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug line-clamp-2 mb-2">
                      {product.name}
                    </p>
                    <p className="text-[15px] font-extrabold text-[#1A1A1A] mb-2.5">
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </p>
                    {/* CHANGED: 약한 outline 버튼 → 채워진 노란 버튼 (문제 #5) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/comparison'); }}
                      className="w-full py-2 bg-[#F5C842] rounded-[10px] text-[12px] font-bold text-white active:bg-[#F0A500] transition-colors"
                    >
                      비교하기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== [섹션 4] 인기 TOP 랭킹 미리보기 — 신규 (문제 #4) ===== */}
      {rankingTop3.length > 0 && (
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[17px] font-bold text-[#1A1A1A]">🏆 이번 주 인기 TOP 3</p>
            <button
              onClick={() => navigate('/ranking')}
              className="text-[13px] font-medium text-[#ABABAB]"
            >
              랭킹 전체 ›
            </button>
          </div>

          <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] divide-y divide-[#EFEFEF]">
            {rankingTop3.map((product, index) => {
              const grade = gradeOf(product);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="flex items-center gap-3 p-3.5 active:bg-[#FAF8F4] cursor-pointer"
                >
                  <span
                    className="w-6 text-center text-[15px] font-extrabold flex-shrink-0"
                    style={{ color: index === 0 ? '#F5C842' : index === 1 ? '#ABABAB' : '#CD7F32' }}
                  >
                    {index + 1}
                  </span>
                  <div className="w-12 h-12 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />
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
                    {grade}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== [섹션 5] 최근 본 상품 — 등급+가격 보강 (문제 #6) ===== */}
      <section className="mt-6 px-4 mb-6">
        <p className="text-[17px] font-bold text-[#1A1A1A] mb-3">최근 본 상품</p>

        {recentList.length === 0 ? (
          // 빈 상태 유지 (토큰만 신규 디자인에 맞춤)
          <div className="bg-white rounded-[16px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="text-3xl mb-2">🐾</div>
            <p className="text-[14px] font-semibold text-[#6B6B6B]">아직 본 상품이 없어요</p>
            <button
              onClick={() => navigate('/search')}
              className="mt-3 bg-[#F5C842] rounded-[10px] px-5 py-2.5 text-[13px] font-bold text-white active:bg-[#F0A500] transition-colors"
            >
              검색하러 가기
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentList.slice(0, 8).map((product) => {
              const grade = gradeOf(product);
              return (
                // CHANGED: 이미지+상품명만 있던 카드에 등급 뱃지와 가격 정보를 추가 (문제 #6).
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="flex-shrink-0 w-[120px] bg-white rounded-[14px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="relative bg-[#F8F8F8] h-[100px]">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
                    <span
                      className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full"
                      style={{ background: getGradeColor(grade) }}
                    >
                      {grade}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-[#1A1A1A] font-medium leading-snug line-clamp-2 mb-1">
                      {product.name}
                    </p>
                    <p className="text-[12px] font-bold text-[#F5C842]">
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
