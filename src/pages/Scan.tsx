import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getProductByBarcode } from '../lib/supabase';
import { normalizeBarcode } from '../lib/productIdentity';
import { createBarcodeDetector, type BarcodeDetectorLike } from '../lib/barcodeDetector';
import { normalizeScannedBarcode } from '../lib/scanBarcode';
import { BarcodeLookupError } from '../lib/barcodeLookupError';

type CamState = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable' | 'no-detector';

/** 뷰파인더 안 자리표시자 바코드 패턴 — 프로토타입 barBars */
const BAR_PATTERN = Array.from({ length: 16 }, (_, i) => ({
  w: `${i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 6}px`,
  o: 0.5 + ((i * 7) % 5) / 10,
}));

export default function Scan() {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const handledRef = useRef(false);
  const mountedRef = useRef(false);
  const cameraGeneration = useRef(0);
  const lastFrameAt = useRef(0);
  const removeCameraListeners = useRef<(() => void) | null>(null);

  const [camState, setCamState] = useState<CamState>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [checkingBarcode, setCheckingBarcode] = useState(false);

  const stopCamera = useCallback(() => {
    cameraGeneration.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    detectorRef.current = null;
    removeCameraListeners.current?.();
    removeCameraListeners.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleBarcode = useCallback(
    async (code: string) => {
      if (handledRef.current) return;
      const normalized = normalizeBarcode(code);
      if (!normalized) {
        setManualError('바코드의 8·12·13·14자리 숫자와 마지막 체크숫자를 확인해 주세요.');
        return;
      }
      handledRef.current = true;
      setCheckingBarcode(true);
      setManualError(null);
      setManualBarcode(normalized);
      setDetected(normalized);
      stopCamera();
      setCamState('idle');
      try {
        // The loaded list is partial and can contain stale visibility. Validate
        // both visibility and equivalent-code ambiguity against the public catalog.
        const remote = await getProductByBarcode(normalized);
        if (!mountedRef.current) return;
        if (remote) {
          navigate(`/product/${remote.id}`);
          return;
        }
        // Only a successful, empty lookup means the barcode is unregistered.
        navigate(`/scan/new?barcode=${encodeURIComponent(normalized)}`);
      } catch (error) {
        if (!mountedRef.current) return;
        handledRef.current = false;
        setManualError(error instanceof BarcodeLookupError
          ? error.message
          : '제품을 확인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
      } finally {
        if (mountedRef.current) setCheckingBarcode(false);
      }
    },
    [navigate, stopCamera],
  );

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || handledRef.current || !mountedRef.current || !streamRef.current) return;
    const generation = cameraGeneration.current;
    if (performance.now() - lastFrameAt.current < 150) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    lastFrameAt.current = performance.now();
    const continueScanning = () => {
      if (mountedRef.current && generation === cameraGeneration.current && !handledRef.current) rafRef.current = requestAnimationFrame(scanLoop);
    };
    detector
      .detect(video)
      .then((codes) => {
        if (!mountedRef.current || generation !== cameraGeneration.current) return;
        const candidate = codes?.map(normalizeScannedBarcode).find((code) => code !== null);
        if (candidate) {
          void handleBarcode(candidate);
          return;
        }
        continueScanning();
      })
      .catch(() => {
        if (!mountedRef.current || generation !== cameraGeneration.current) return;
        stopCamera();
        setCamState('no-detector');
      });
  }, [handleBarcode, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setTorchOn(false);
    setDetected(null);
    setManualError(null);
    const generation = cameraGeneration.current;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCamState('unavailable');
      return;
    }
    setCamState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current || generation !== cameraGeneration.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const cameraEnded = () => {
        if (!mountedRef.current || generation !== cameraGeneration.current) return;
        stopCamera();
        setCamState('unavailable');
      };
      stream.getTracks().forEach((track) => track.addEventListener('ended', cameraEnded));
      removeCameraListeners.current = () => stream.getTracks().forEach((track) => track.removeEventListener('ended', cameraEnded));
      if (videoRef.current) {
        // Set properties before srcObject/play as required for inline iPhone video.
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!mountedRef.current || generation !== cameraGeneration.current) return;
      try {
        const detector = await createBarcodeDetector();
        if (!mountedRef.current || generation !== cameraGeneration.current) return;
        detectorRef.current = detector;
        setCamState('live');
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        if (!mountedRef.current || generation !== cameraGeneration.current) return;
        stopCamera();
        setCamState('no-detector');
      }
    } catch (err) {
      if (!mountedRef.current || generation !== cameraGeneration.current) return;
      stopCamera();
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setCamState('denied');
      else setCamState('unavailable');
    }
  }, [scanLoop, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    handledRef.current = false;
    if (!document.hidden) void startCamera();
    const visibilityChanged = () => {
      if (document.hidden) {
        stopCamera();
        setCamState('idle');
      } else if (!handledRef.current) {
        void startCamera();
      }
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', visibilityChanged);
      stopCamera();
    };
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
  const showFallback =
    camState === 'denied' || camState === 'unavailable' || camState === 'no-detector' || camState === 'idle';

  const hint = checkingBarcode
    ? '바코드로 제품을 확인하고 있습니다…'
    : showFallback
      ? '바코드 숫자를 입력하거나 제품명으로 검색해 주세요'
      : '바코드를 읽고 있습니다…';

  const submitManualBarcode = useCallback(async () => {
    await handleBarcode(manualBarcode);
  }, [handleBarcode, manualBarcode]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A08', zIndex: 30, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto' }}>
      <Helmet>
        <title>스캔 | 베로로</title>
        <meta name="description" content="바코드를 스캔해 제품 성분 분석을 확인해 주세요." />
      </Helmet>

      {/* 상단 바 */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(14px + env(safe-area-inset-top,0px)) 14px 14px' }}>
        <button
          type="button"
          onClick={() => { stopCamera(); navigate(-1); }}
          aria-label="닫기"
          style={{
            width: '38px', height: '38px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,.12)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#fff' }}>바코드 스캔</span>
        {showLive && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="플래시"
            style={{
              marginLeft: 'auto', width: '38px', height: '38px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: torchOn ? '#FFD90A' : 'rgba(255,255,255,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={torchOn ? '#15150F' : '#fff'} strokeWidth="2" strokeLinejoin="round">
              <path d="M13 2L5 13h5l-1 9 8-11h-5z" />
            </svg>
          </button>
        )}
      </div>

      {/* 뷰파인더 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', visibility: showLive ? 'visible' : 'hidden' }}
          />
        {!showLive && (
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 40%, #2A2A22 0%, #111110 70%)' }} />
        )}

        <div
          style={{
            position: 'absolute', left: '34px', right: '34px', top: '26%', bottom: '30%',
            borderRadius: '18px', boxShadow: '0 0 0 3000px rgba(0,0,0,.45)',
          }}
        >
          <span style={{ position: 'absolute', left: '-2px', top: '-2px', width: '34px', height: '34px', borderTop: '4px solid #FFD90A', borderLeft: '4px solid #FFD90A', borderRadius: '14px 0 0 0' }} />
          <span style={{ position: 'absolute', right: '-2px', top: '-2px', width: '34px', height: '34px', borderTop: '4px solid #FFD90A', borderRight: '4px solid #FFD90A', borderRadius: '0 14px 0 0' }} />
          <span style={{ position: 'absolute', left: '-2px', bottom: '-2px', width: '34px', height: '34px', borderBottom: '4px solid #FFD90A', borderLeft: '4px solid #FFD90A', borderRadius: '0 0 0 14px' }} />
          <span style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: '34px', height: '34px', borderBottom: '4px solid #FFD90A', borderRight: '4px solid #FFD90A', borderRadius: '0 0 14px 0' }} />

          {!showLive && (
            <span style={{ position: 'absolute', inset: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', opacity: 0.5 }}>
              {BAR_PATTERN.map((bar, i) => (
                <span key={i} style={{ height: '70px', background: '#fff', width: bar.w, opacity: bar.o }} />
              ))}
            </span>
          )}

          {showLive && !detected && (
            <span className="vr-laser" style={{ position: 'absolute', left: '6px', right: '6px', height: '3px', background: '#FFD90A', boxShadow: '0 0 22px 6px rgba(255,217,10,.7)' }} />
          )}
          {detected && (
            <span className="vr-anim-fade" style={{ position: 'absolute', inset: 0, border: '3px solid #5AD07F', borderRadius: '18px' }} />
          )}
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '26px', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{hint}</div>
          {detected && (
            <div style={{ fontSize: '12px', color: '#8A8A7C', marginTop: '5px', fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {detected}
            </div>
          )}
        </div>
      </div>

      {/* 하단 액션 */}
      <div style={{ flex: 'none', padding: '16px 16px calc(16px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                aria-label="바코드 번호"
                inputMode="numeric"
                autoComplete="off"
                value={manualBarcode}
                disabled={checkingBarcode}
                onChange={(event) => setManualBarcode(event.target.value.replace(/\D/g, '').slice(0, 14))}
                onKeyDown={(event) => { if (event.key === 'Enter') void submitManualBarcode(); }}
                placeholder="바코드 숫자 입력"
                style={{ flex: 1, minWidth: 0, border: '1.5px solid rgba(255,255,255,.28)', borderRadius: 12, background: 'rgba(255,255,255,.1)', color: '#fff', padding: '0 13px', fontSize: 16, letterSpacing: '.04em' }}
              />
              <button
                type="button"
                aria-label="바코드 확인"
                disabled={checkingBarcode || manualBarcode.length < 8}
                onClick={() => void submitManualBarcode()}
                style={{ border: 0, borderRadius: 12, background: '#FFD90A', color: '#15150F', padding: '13px 15px', fontWeight: 850, opacity: checkingBarcode || manualBarcode.length < 8 ? .45 : 1 }}
              >
                {checkingBarcode ? '확인 중' : '확인'}
              </button>
            </div>
            {manualError && <div role="alert" style={{ color: '#FFB3A7', fontSize: 12, margin: '-2px 0 10px' }}>{manualError}</div>}
            <button
              type="button"
              style={{ width: '100%', padding: '13px', background: 'none', border: 'none', fontSize: '13.5px', fontWeight: 800, color: '#B6B6A9', cursor: 'pointer' }}
              onClick={() => { stopCamera(); navigate('/search'); }}
            >
              제품명으로 직접 검색
            </button>
            {showFallback && !checkingBarcode && (
              <button
                type="button"
                onClick={() => { handledRef.current = false; void startCamera(); }}
                style={{
                  width: '100%', marginTop: '10px', padding: '13px', background: 'none',
                  border: '1.5px solid rgba(255,255,255,.22)', borderRadius: '12px',
                  fontSize: '13.5px', fontWeight: 800, color: '#fff', cursor: 'pointer',
                }}
              >
                카메라 다시 시도
              </button>
            )}
            {showFallback && !checkingBarcode && <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#B6B6A9', marginTop: '10px', lineHeight: 1.6 }}>
              {camState === 'denied'
                ? '설정에서 카메라 권한을 허용한 뒤 다시 시도해 주세요.'
                : camState === 'no-detector'
                  ? '자동 인식을 시작하지 못했습니다. 바코드 숫자를 입력해 주세요.'
                  : window.isSecureContext === false
                    ? '카메라는 HTTPS 주소에서 사용할 수 있습니다. 안전한 주소로 다시 열어 주세요.'
                    : '다른 앱의 카메라를 닫고 다시 시도해 주세요. 인앱 브라우저라면 Safari 또는 Chrome으로 열어 주세요.'}
            </div>}
      </div>
    </div>
  );
}
