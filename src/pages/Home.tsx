// @ts-nocheck
// CHANGED: 홈 전면 재디자인 v3 — TOSS UI 언어 + 엄격한 타이포 스케일.
//  · 글자 크기를 8단계 스케일(11·12·13·14·15·18·20·28)로 통일하고 굵기 체계를 정리
//  · 라이트 그레이 캔버스(#F2F4F6) 위 화이트 카드 + 은은한 그림자(보더 노이즈 제거)
//  · 아이콘 크기/정렬 규칙화(섹션 18 / 퀵 24 / 별 13 / 하트 15)
//  · 식단 적합도를 토스 신용점수형 도넛 게이지로 시각화
//  데이터 fetch/상태 로직은 그대로 유지. 모바일 우선.
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Heart, ScanLine, Trophy, Scale, BookOpen, Star, Camera } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { displayBrand } from '../utils/brandLabel';

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

// 토스식 4분할 퀵액션 — 앱의 핵심 진입점
const QUICK_ACTIONS = [
  { label: '성분분석', Icon: ScanLine, to: '/scanner', bg: '#FEF3D6', fg: '#D99500' },
  { label: '인기 랭킹', Icon: Trophy, to: '/ranking', bg: '#E5F7EE', fg: '#15B36B' },
  { label: '비교하기', Icon: Scale, to: '/comparison', bg: '#E7F0FF', fg: '#3182F6' },
  { label: '성분사전', Icon: BookOpen, to: '/dictionary', bg: '#EFE9FF', fg: '#7C5CFC' },
];

// 토스 신용점수형 도넛 게이지
function ScoreRing({ score, size = 84 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (c * pct) / 100;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F4" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(score)} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={T.score}>{score}</span>
        <span style={{ ...T.micro, color: MUTED, marginTop: 2 }}>점</span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: CARD_SM }}>
      <div className="aspect-square bg-[#EEF1F4] animate-pulse" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-2.5 w-1/3 bg-[#EEF1F4] rounded animate-pulse" />
        <div className="h-3 w-full bg-[#EEF1F4] rounded animate-pulse" />
        <div className="h-3.5 w-1/2 bg-[#EEF1F4] rounded animate-pulse" />
      </div>
    </div>
  );
}

// 섹션 헤더 — 그레이 캔버스 위, 제목(18/800) + 전체보기
function SectionHeader({ title, sub, onMore }) {
  return (
    <div className="flex items-center justify-between mb-3 px-5">
      <div className="min-w-0">
        <p style={T.section}>{title}</p>
        {sub && <p className="mt-1 truncate" style={T.cap}>{sub}</p>}
      </div>
      {onMore && (
        <button onClick={onMore} className="flex items-center flex-shrink-0 -mr-1" style={{ ...T.sub, color: MUTED, fontWeight: 600 }}>
          전체보기 <ChevronRight size={16} style={{ marginLeft: -1 }} />
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { products, profile, recentViews, isLoggedIn, favorites, toggleFavorite, isLoadingProducts } = useStore();

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  const petName = hasPetProfile ? profile.name : null;

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  const topRanked = useMemo(() => {
    if (!products.length) return [];
    return [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6);
  }, [products]);

  const rankingTop3 = useMemo(
    () => [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 3),
    [products],
  );

  const recentList = useMemo(() => (recentViews?.length ? recentViews : []), [recentViews]);

  const favoriteSet = new Set(favorites || []);
  const loading = isLoadingProducts && products.length === 0;
  const RANK_STYLE = [
    { bg: '#FEF0C7', fg: '#D99500' }, // 1위 골드
    { bg: '#EBEEF2', fg: '#6B7684' }, // 2위 실버
    { bg: '#F7E7DB', fg: '#B97A45' }, // 3위 브론즈
  ];

  return (
    // veroro-home: preflight 미사용 환경에서 border/divide 유틸이 동작하도록 하는 스코프 클래스.
    <div className="veroro-home min-h-screen pb-28" style={{ background: '#F2F4F6' }}>

      {/* ===== 검색 바 ===== */}
      <div className="px-5 pt-3.5 pb-0.5">
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-2.5 bg-white rounded-[14px] px-4 h-[50px] text-left active:scale-[0.99] transition-transform"
          style={{ boxShadow: CARD_SM }}
        >
          <Search size={19} color={MUTED} strokeWidth={2.2} />
          <span style={{ ...T.body, color: MUTED, fontWeight: 500 }}>사료·간식·브랜드 검색</span>
        </button>
      </div>

      {/* ===== [1] 히어로 — 식단 적합도 / 온보딩 ===== */}
      <div className="px-5 pt-3">
        {hasPetProfile ? (
          <button
            onClick={() => navigate('/pet-profile')}
            className="w-full bg-white rounded-[20px] p-5 text-left active:scale-[0.99] transition-transform"
            style={{ boxShadow: CARD }}
          >
            <div className="flex items-center gap-4">
              <ScoreRing score={healthScore} />
              <div className="flex-1 min-w-0">
                <p style={{ ...T.sub, fontWeight: 600 }}>{petName} 보호자님 👋</p>
                <p className="mt-1" style={T.h1}>
                  {healthScore}점 <span style={{ color: scoreColor(healthScore) }}>· {scoreLabel(healthScore)}</span>
                </p>
                <p className="mt-1.5" style={T.cap}>
                  {petName}에게 맞는 사료 {Math.max(topRanked.length, 1)}개를 찾았어요
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: `1px solid ${LINE}` }}>
              <span style={T.body}>내 아이 프로필 보기</span>
              <ChevronRight size={18} color={MUTED} />
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
            className="w-full bg-white rounded-[20px] p-5 text-left relative overflow-hidden active:scale-[0.99] transition-transform"
            style={{ boxShadow: CARD }}
          >
            <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full" style={{ background: 'rgba(245,200,66,0.13)' }} />
            <div className="relative">
              <span className="inline-block px-2.5 py-1 rounded-full mb-3" style={{ ...T.micro, background: '#FEF3D6', color: '#C98A00' }}>
                AI 맞춤 분석
              </span>
              <p style={T.h1}>우리 아이에게 딱 맞는<br />사료를 찾아드려요</p>
              <p className="mt-2 mb-4" style={T.sub}>1분이면 성분·영양까지 꼼꼼하게 분석해드려요</p>
              <span
                className="inline-flex items-center gap-1 px-5 h-[46px] rounded-[13px] text-white"
                style={{ ...T.body, color: '#fff', background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)', boxShadow: '0 6px 16px rgba(240,165,0,0.28)' }}
              >
                반려동물 등록하기 <ChevronRight size={17} />
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
            <p className="text-[12px] font-semibold text-white/75 mb-1">맞춤 사료 추천</p>
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

      {/* ===== [2] 퀵액션 4분할 ===== */}
      <div className="px-5 pt-3">
        <div className="bg-white rounded-[20px] px-1 py-4" style={{ boxShadow: CARD }}>
          <div className="grid grid-cols-4">
            {QUICK_ACTIONS.map(({ label, Icon, to, bg, fg }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 py-1 active:scale-[0.94] transition-transform"
              >
                <span className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={24} color={fg} strokeWidth={2.1} />
                </span>
                <span style={{ ...T.cap, color: SUB, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== [3] 스캐너 프로모 배너 ===== */}
      <div className="px-5 pt-3">
        <button
          onClick={() => navigate('/scanner')}
          className="w-full flex items-center gap-3 rounded-[16px] p-4 text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #FFFBEF 0%, #FDF1CE 100%)' }}
        >
          <span className="w-11 h-11 rounded-[13px] bg-white flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(217,149,0,0.20)' }}>
            <Camera size={22} color="#D99500" strokeWidth={2.1} />
          </span>
          <div className="flex-1 min-w-0">
            <p style={T.title}>사진 한 장으로 성분 분석</p>
            <p className="mt-0.5" style={{ ...T.cap, color: '#A77F2E' }}>사료 뒷면을 찍으면 위험 성분을 알려드려요</p>
          </div>
          <ChevronRight size={18} color="#C99A2E" />
        </button>
      </div>

      {/* ===== [4] 카테고리 ===== */}
      <div className="pt-7">
        <p className="mb-3 px-5" style={T.section}>카테고리</p>
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_CHIPS.map(({ icon, label, category }) => (
            <button
              key={label}
              onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white rounded-full pl-3 pr-3.5 h-[42px] active:bg-[#FEF9E7] transition-colors"
              style={{ ...T.sub, color: INK, fontWeight: 600, boxShadow: CARD_SM }}
            >
              <span className="text-[15px] leading-none">{icon}</span>
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
              {petName ? '반려동물 맞춤 추천이에요' : '인기 있는 사료부터 확인해보세요'}
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
          <div className="grid grid-cols-2 gap-3 px-5">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : topRanked.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 px-5">
            {topRanked.slice(0, 6).map((product) => {
              const isFav = favoriteSet.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative bg-white rounded-[16px] active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ boxShadow: CARD_SM }}
                >
                  {/* CHANGED(P1-6): overflow-hidden을 이미지에만 적용 → 등급 뱃지/하트가
                      카드 둥근 모서리에 잘리지 않도록. 뱃지·하트는 카드 직속 오버레이. */}
                  <div className="relative bg-[#F4F6F8] aspect-square rounded-t-[16px] overflow-hidden">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                      aria-label="찜하기"
                      className="absolute top-2 right-2 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Heart size={14} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#9A9A9A'} />
                    </button>
                  </div>
                  <span
                    className="absolute top-2.5 left-2.5 text-white px-2 py-0.5 rounded-full"
                    style={{ ...T.micro, fontWeight: 800, background: gradeColor(grade).color }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                    aria-label="찜하기"
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <Heart size={15} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#B0B8C1'} />
                  </button>
                  <div className="p-3">
                    <p className="truncate" style={T.cap}>{displayBrand(product.brand, product.name)}</p>
                    <p className="mt-0.5 mb-1.5 line-clamp-2 min-h-[36px]" style={T.prodName}>{product.name}</p>
                    {product.averageRating > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Star size={13} fill="#F5C842" color="#F5C842" />
                        <span style={{ ...T.cap, color: SUB, fontWeight: 700 }}>{product.averageRating.toFixed(1)}</span>
                        {product.reviewsCount > 0 && (
                          <span style={T.cap}>· 리뷰 {product.reviewsCount.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    <p style={T.price}>{product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5">
            <div className="bg-white rounded-[16px] p-8 text-center" style={{ boxShadow: CARD_SM }}>
              <div className="text-[40px] mb-2 leading-none">🍽️</div>
              <p style={T.title}>추천할 사료를 준비 중이에요</p>
              <p className="mt-1 mb-4" style={T.cap}>원하는 사료를 직접 검색해보세요</p>
              <button
                onClick={() => navigate('/search')}
                className="text-white px-6 h-[44px] rounded-[12px] inline-flex items-center"
                style={{ ...T.body, color: '#fff', background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)' }}
              >
                사료 검색하기
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== [6] 인기 TOP 3 ===== */}
      {(loading || rankingTop3.length > 0) && (
        <section className="pt-7">
          <SectionHeader title="이번 주 인기 TOP 3" sub="베로로 보호자들이 가장 많이 본 사료" onMore={() => navigate('/ranking')} />
          <div className="px-5">
            <div className="bg-white rounded-[20px] overflow-hidden" style={{ boxShadow: CARD }}>
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4" style={{ borderTop: i ? `1px solid ${LINE}` : 'none' }}>
                      <div className="w-7 h-7 bg-[#EEF1F4] rounded-[9px] animate-pulse flex-shrink-0" />
                      <div className="w-12 h-12 bg-[#EEF1F4] rounded-[12px] animate-pulse flex-shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-2/3 bg-[#EEF1F4] rounded animate-pulse" />
                        <div className="h-3 w-1/3 bg-[#EEF1F4] rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))
              : rankingTop3.map((product, index) => {
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
                    </div>
                  );
                })}
          </div>
        </section>
      )}

      {/* ===== [7] 최근 본 상품 ===== */}
      {recentList.length > 0 && (
        <section className="pt-7">
          <p className="mb-3 px-5" style={T.section}>최근 본 상품</p>
          <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar pb-1">
            {recentList.slice(0, 8).map((product) => {
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative flex-shrink-0 w-[128px] bg-white rounded-[16px] active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ boxShadow: CARD_SM }}
                >
                  {/* CHANGED(P1-6): 이미지에만 overflow-hidden → 뱃지 클리핑 방지 */}
                  <div className="relative bg-[#F4F6F8] h-[104px] rounded-t-[16px] overflow-hidden">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <span
                    className="absolute top-2 left-2 text-white px-1.5 py-0.5 rounded-full"
                    style={{ ...T.micro, fontSize: 10, fontWeight: 800, background: gradeColor(grade).color }}
                  >
                    {grade === 'pending' ? '분석 중' : grade}
                  </span>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-[34px]" style={T.prodName}>{product.name}</p>
                    <p className="mt-1" style={{ ...T.price, fontSize: 13 }}>
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
