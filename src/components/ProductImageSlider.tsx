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
 * 풀와이드 가로 스와이프 슬라이더.
 * - 이미지가 1장이면 도트 인디케이터를 숨기고 단일 이미지로 표시 (현재 데이터 모델: imageUrl 1개)
 * - 여러 장이면 CSS scroll-snap 으로 네이티브 스와이프 + 하단 도트
 * - 우상단 좋아요(하트) 버튼 유지
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
    <div className="pdp-slider">
      <div className="pdp-slider-track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((src, i) => (
          <div className="pdp-slide" key={`${src}-${i}`}>
            {src ? (
              <ProductImage
                src={src}
                alt={`${productName} 이미지 ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="pdp-slide-empty"><span style={{ fontSize: 64 }}>🥫</span></div>
            )}
          </div>
        ))}
      </div>

      {onToggleFav && (
        <button
          type="button"
          className="pdp-fav-btn"
          onClick={onToggleFav}
          aria-label={isFav ? '찜 해제' : '찜하기'}
          aria-pressed={!!isFav}
        >
          <Heart size={20} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#8B95A1'} />
        </button>
      )}

      {slides.length > 1 && (
        <div className="pdp-dots" role="tablist" aria-label="이미지 인디케이터">
          {slides.map((_, i) => (
            <span key={i} className={`pdp-dot ${i === active ? 'pdp-dot--active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
