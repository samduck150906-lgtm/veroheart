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
 * CHANGED(Tailwind, #1): 분리됐던 2개 카드 → 풀와이드 단일 스와이프 슬라이더(360px).
 * - 컨테이너 좌우 패딩(20px) 밖으로 -mx-5 브레이크아웃
 * - 이미지 1장이면 도트 숨김, 여러 장이면 CSS scroll-snap 스와이프 + 하단 도트
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
    <div className="relative -mx-5 overflow-hidden bg-gradient-to-br from-[#FEF9E7] to-[#FDE68A]" style={{ height: 360 }}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex h-full overflow-x-auto snap-x snap-mandatory"
      >
        {slides.map((src, i) => (
          <div key={`${src}-${i}`} className="flex-shrink-0 w-full h-full snap-start">
            {src ? (
              <ProductImage
                src={src}
                alt={`${productName} 이미지 ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-[64px]">🥫</div>
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
          className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md z-10"
        >
          <Heart size={20} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#8B8B8B'} />
        </button>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" role="tablist" aria-label="이미지 인디케이터">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full bg-white transition-all ${i === active ? 'w-5 opacity-100' : 'w-1.5 opacity-50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
