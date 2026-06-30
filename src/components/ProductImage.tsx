import { useState } from 'react';

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

/**
 * Product image component that handles:
 * - Direct public Supabase Storage URL loading
 * - Premium gradient placeholder fallback on load error or missing image
 */
export default function ProductImage({ src, alt, style, ...props }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
          color: '#8B95A1',
          fontSize: '11px',
          fontWeight: 800,
          textAlign: 'center',
          padding: '16px',
          boxSizing: 'border-box',
          border: '1px solid rgba(0,0,0,0.03)',
          ...style
        }}
      >
        <span style={{ fontSize: '22px', marginBottom: '6px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>🐾</span>
        <span style={{ 
          fontSize: '10px', 
          color: '#64748B', 
          fontWeight: 800, 
          maxWidth: '90%', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          letterSpacing: '-0.02em'
        }}>
          {alt || '베로로 추천'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || '상품 이미지'}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      style={{
        display: 'block',
        ...style
      }}
      {...props}
    />
  );
}
