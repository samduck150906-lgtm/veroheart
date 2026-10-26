import { useEffect, useState } from 'react';
import { SPLASH_TAGLINE } from '../copy/marketing';
import Wordmark from './Wordmark';

/** Keep logo and caption on one timeline, including uncached/failed image loads. */
export default function StartupSplash({ onMinimumComplete }: { onMinimumComplete: () => void }) {
  const [asset, setAsset] = useState<'pending' | 'loaded' | 'fallback'>('pending');
  useEffect(() => {
    const timeout = window.setTimeout(() => setAsset((current) => current === 'pending' ? 'fallback' : current), 800);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (asset === 'pending') return;
    const timer = window.setTimeout(onMinimumComplete, 1100);
    return () => window.clearTimeout(timer);
  }, [asset, onMinimumComplete]);
  return (
    <div role="status" aria-label="앱 준비 중" style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#15150F', display: 'grid', placeItems: 'center' }}>
      <div data-testid="splash-brand" style={{ visibility: asset === 'pending' ? 'hidden' : 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {asset === 'fallback'
          ? <span style={{ height: 44, fontSize: 40, lineHeight: '44px', fontWeight: 900, color: '#FFD90A', letterSpacing: '-0.04em' }}>VERORO</span>
          : <Wordmark height={44} onLoad={() => setAsset((current) => current === 'pending' ? 'loaded' : current)} onError={() => setAsset('fallback')} />}
        <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#A5A596', letterSpacing: '-0.01em', textAlign: 'center', padding: '0 24px' }}>{SPLASH_TAGLINE}</div>
      </div>
      <span style={{ position: 'absolute', bottom: 44, color: '#FFD90A', fontSize: 13 }}>앱을 준비하고 있어요</span>
    </div>
  );
}
