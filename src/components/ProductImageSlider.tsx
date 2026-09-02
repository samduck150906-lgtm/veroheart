import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import ProductImage from './ProductImage';

interface ProductImageSliderProps {
  /** 상품 이미지 URL 목록 (없으면 플레이스홀더 1장) */
  images: string[];
  productName: string;
  isFav?: boolean;
  onToggleFav?: () => void;
}

/**
 * 풀와이드 단일 스와이프 슬라이더(360px).
 * - 컨테이너 좌우 패딩(20px) 밖으로 브레이크아웃
 * - 이미지 1장이면 도트 숨김, 여러 장이면 CSS scroll-snap 스와이프 + 하단 도트
 *
 * 이 파일은 Tailwind 유틸 클래스로 작성돼 있었는데 이 프로젝트에는 Tailwind 가
 * 설치돼 있지 않다(index.css 에 일부 이름만 흉내 낸 규칙이 있을 뿐이다).
 * 그래서 relative/absolute/flex/snap-x 같은 클래스가 전부 정의되지 않은 채였고,
 * 스와이프 트랙도 찜 버튼 위치도 도트 위치도 의도대로 잡히지 않았다.
 * 프로젝트의 다른 컴포넌트와 같은 방식(인라인 스타일 + 디자인 토큰)으로 옮겼다.
 * (`.no-scrollbar` 는 index.css 에 실제로 정의돼 있어 그대로 쓴다.)
 */
export default function ProductImageSlider({ images, productName, isFav, onToggleFav }: ProductImageSliderProps) {
  const slides = images.length > 0 ? images : [''];
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== active) setActive(idx);
  };

  return (
    <div
      style={{
        position: 'relative',
        height: 360,
        margin: '0 -20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #FEF9E7 0%, #FDE68A 100%)',
      }}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar"
        style={{
          display: 'flex',
          height: '100%',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}
      >
        {slides.map((src, i) => (
          <div
            key={`${src}-${i}`}
            style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'start' }}
          >
            {src ? (
              <ProductImage
                src={src}
                alt={`${productName} 이미지 ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%', fontSize: '64px',
                }}
              >
                🥫
              </div>
            )}
          </div>
        ))}
      </div>

      {onToggleFav && (
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={isFav ? '찜 해제' : '찜하기'}
          aria-pressed={!!isFav}
          style={{
            position: 'absolute', top: 16, right: 16, width: 40, height: 40,
            borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
            background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(17, 24, 39, 0.14)', zIndex: 10,
          }}
        >
          <Heart size={20} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#8B8B8B'} />
        </button>
      )}

      {slides.length > 1 && (
        <div
          role="tablist"
          aria-label="이미지 인디케이터"
          style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6, zIndex: 10,
          }}
        >
          {slides.map((_, i) => (
            <span
              key={i}
              style={{
                height: 6,
                width: i === active ? 20 : 6,
                borderRadius: 999,
                background: '#FFFFFF',
                opacity: i === active ? 1 : 0.5,
                transition: 'width .2s ease, opacity .2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
