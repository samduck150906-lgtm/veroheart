import { useState } from 'react';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80';

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

/**
 * Product image component that handles:
 * - Coupang hotlink protection via referrerPolicy="no-referrer"
 * - Fallback image on load error
 */
export default function ProductImage({ src, alt, style, ...props }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <img
      src={hasError || !src ? FALLBACK_IMAGE : src}
      alt={alt || '상품 이미지'}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      style={style}
      {...props}
    />
  );
}
