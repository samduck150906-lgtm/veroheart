import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Search as SearchIcon, Barcode, Zap, ZapOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getProductByBarcode } from '../lib/supabase';

type CamState = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable';

/** 실험적 BarcodeDetector API — 표준 TS 타입이 없어 필요한 부분만 선언한다. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
}

export default function Scan() {
  const navigate = useNavigate();
  const { products } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const handledRef = useRef(false);

  const [camState, setCamState] = useState<CamState>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleBarcode = useCallback(
    async (code: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      setDetected(code);
      stopCamera();
      // 1) 이미 로드된 상품의 바코드와 즉시 매칭
      const local = products.find((p) => p.barcode === code);
      if (local) {
        navigate(`/product/${local.id}`);
        return;
      }
      // 2) DB 조회 (products.barcode 컬럼이 있으면 매칭)
      const remote = await getProductByBarcode(code);
      if (remote) {
        navigate(`/product/${remote.id}`);
        return;
      }
      // 3) 폴백: 바코드를 검색어로 넘겨 검색 화면으로 인계
      navigate(`/search?q=${encodeURIComponent(code)}`);
    },
    [products, navigate, stopCamera],
  );

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || handledRef.current) return;
    detector
      .detect(video)
      .then((codes: DetectedBarcode[]) => {
        if (codes && codes.length > 0 && codes[0].rawValue) {
          handleBarcode(String(codes[0].rawValue));
          return;
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(scanLoop);
      });
  }, [handleBarcode]);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCamState('unavailable');
      return;
    }
    setCamState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamState('live');

      const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (BD) {
        try {
          detectorRef.current = new BD({
            formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'],
          });
          rafRef.current = requestAnimationFrame(scanLoop);
        } catch {
          detectorRef.current = null;
        }
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setCamState('denied');
      else setCamState('unavailable');
    }
  }, [scanLoop]);

  useEffect(() => {
    handledRef.current = false;
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn((v) => !v);
    } catch {
      /* torch 미지원 기기 */
    }
  }, [torchOn]);

  const showLive = camState === 'live' || camState === 'starting';
  const showFallback = camState === 'denied' || camState === 'unavailable';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0B0D10', zIndex: 30, overflow: 'hidden' }}>
      <Helmet>
        <title>스캔 | 베로로</title>
        <meta name="description" content="바코드를 스캔해 제품 성분 분석을 확인하세요." />
      </Helmet>
      <style>{`@keyframes veroScanLine { 0%{top:6%} 50%{top:90%} 100%{top:6%} }`}</style>

      {/* Camera preview */}
      {showLive && (
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Dim + guide frame */}
      {showLive && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }}>
          <div
            style={{
              position: 'absolute', left: '50%', top: '44%', transform: 'translate(-50%,-50%)',
              width: '78%', height: '26%', borderRadius: 20,
              boxShadow: '0 0 0 100vmax rgba(0,0,0,0.45)', overflow: 'hidden',
            }}
          >
            {/* corner brackets */}
            {[
              { top: 0, left: 0, borderWidth: '3px 0 0 3px' },
              { top: 0, right: 0, borderWidth: '3px 3px 0 0' },
              { bottom: 0, left: 0, borderWidth: '0 0 3px 3px' },
              { bottom: 0, right: 0, borderWidth: '0 3px 3px 0' },
            ].map((c, i) => (
              <span key={i} style={{ position: 'absolute', width: 26, height: 26, borderStyle: 'solid', borderColor: '#FEE500', borderRadius: 4, ...c }} />
            ))}
            {/* scan line */}
            <span style={{ position: 'absolute', left: '6%', right: '6%', height: 2, background: 'linear-gradient(90deg,transparent,#FEE500,transparent)', animation: 'veroScanLine 2.4s ease-in-out infinite' }} />
          </div>

          <p style={{ position: 'absolute', left: 0, right: 0, top: 'calc(44% + 22vh)', textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 700, padding: '0 32px', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {detectorRef.current
              ? '제품 뒷면 바코드를 프레임 안에 맞춰주세요'
              : '바코드 자동 인식이 지원되지 않는 기기예요. 아래에서 직접 검색해 주세요'}
          </p>
        </div>
      )}

      {/* Fallback (권한 거부 / 미지원) */}
      {showFallback && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', color: '#fff' }}>
          <Barcode size={44} color="#FEE500" style={{ marginBottom: 18 }} />
          <p style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
            {camState === 'denied' ? '카메라 권한이 필요해요' : '이 기기에서는 카메라 스캔을 쓸 수 없어요'}
          </p>
          <p style={{ fontSize: 13, opacity: 0.75, margin: '8px 0 24px', lineHeight: 1.6 }}>
            {camState === 'denied'
              ? '설정에서 카메라 접근을 허용하거나, 제품명으로 직접 검색해 분석할 수 있어요.'
              : '제품명으로 직접 검색해 분석을 시작해 보세요.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/search')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 16, border: 'none', background: '#FEE500', color: '#191F28', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}
          >
            <SearchIcon size={18} /> 직접 검색하기
          </button>
        </div>
      )}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top,0px))', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button
          type="button"
          onClick={() => { stopCamera(); navigate(-1); }}
          aria-label="닫기"
          style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
        </button>
        {showLive && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="플래시"
            style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: torchOn ? '#FEE500' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: torchOn ? '#191F28' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {torchOn ? <Zap size={19} /> : <ZapOff size={19} />}
          </button>
        )}
      </div>

      {/* Bottom bar: 인식 결과 + 직접 검색 */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(28px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 24px' }}>
        {detected && (
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, opacity: 0.9 }}>인식됨: {detected}</div>
        )}
        <button
          type="button"
          onClick={() => { stopCamera(); navigate('/search'); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', background: 'none', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: 0.9 }}
        >
          <SearchIcon size={16} /> 제품명으로 직접 검색
        </button>
      </div>
    </div>
  );
}
