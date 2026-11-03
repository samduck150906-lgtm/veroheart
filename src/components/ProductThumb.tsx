import { useState } from 'react';
import { monogram } from '../lib/veroroDesign';
import { productImageUrl } from '../utils/productImage';

interface ProductThumbProps {
  src?: string;
  alt: string;
  /** 모노그램 원본 — 보통 브랜드명 */
  monoSource: string;
  size?: number | string;
  height?: number | string;
  radius?: number;
  /** 모노그램 글자 크기 */
  fontSize?: number;
  style?: React.CSSProperties;
}

/**
 * 제품 썸네일 — 디자인의 연한 타일 + 모노그램 자리표시자.
 * 이미지가 있으면 채우고, 없거나 실패하면 프로토타입과 동일한 모노그램 타일을 보여준다.
 */
export default function ProductThumb({
  src,
  alt,
  monoSource,
  size,
  height,
  radius = 13,
  fontSize = 19,
  style,
}: ProductThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const imageSrc = productImageUrl(src);
  const showImage = Boolean(imageSrc) && failedSrc !== imageSrc;

  return (
    <div
      className="vr-mono-tile"
      style={{
        width: size ?? '100%',
        height: height ?? size ?? '100%',
        borderRadius: `${radius}px`,
        fontSize: `${fontSize}px`,
        position: 'relative',
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(imageSrc)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span aria-hidden>{monogram(monoSource)}</span>
      )}
    </div>
  );
}
