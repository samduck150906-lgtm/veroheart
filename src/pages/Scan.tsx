import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { getProductByBarcode } from '../lib/supabase';

type CamState = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable' | 'no-detector';

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
      // 1) 이미 로드된 상품의 바코드와 즉시 매칭.
      //    이 효과는 마운트 때 한 번만 도는데 제품 목록은 그 뒤에 채워지므로,
      //    클로저에 갇힌 값 대신 호출 시점의 스토어 값을 읽는다.
      const local = useStore.getState().products.find((p) => p.barcode === code);
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
    [navigate, stopCamera],
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

      // BarcodeDetector 가 없으면(iOS Safari 등) 아무리 비춰도 인식되지 않는다.
      // 카메라만 켜 둔 채 "읽고 있어요"처럼 보이면 사용자는 계속 기다리게 되므로,
      // 카메라를 끄고 직접 검색으로 안내한다.
      const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!BD) {
        stopCamera();
        setCamState('no-detector');
        return;
      }
      try {
        detectorRef.current = new BD({
          formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'],
        });
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        detectorRef.current = null;
        stopCamera();
        setCamState('no-detector');
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setCamState('denied');
      else setCamState('unavailable');
    }
  }, [scanLoop, stopCamera]);

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
  const showFallback =
    camState === 'denied' || camState === 'unavailable' || camState === 'no-detector';

  const hint = detected
    ? '제품을 찾았어'
    : showFallback
      ? '카메라를 쓸 수 없어. 직접 검색으로 넘어가자'
      : '바코드를 읽고 있어…';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A08', zIndex: 30, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto' }}>
      <Helmet>
        <title>스캔 | 베로로</title>
        <meta name="description" content="바코드를 스캔해 제품 성분 분석을 확인하세요." />
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
        {showLive && (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
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
        {showFallback ? (
          <>
            <button
              type="button"
              className="vr-btn vr-btn--primary"
              style={{ padding: '16px', fontSize: '15.5px' }}
              onClick={() => { stopCamera(); navigate('/search'); }}
            >
              직접 검색하기
            </button>
            {camState === 'denied' && (
              // 브라우저는 한 번 거절되면 다시 묻지 않는다. 설정에서 허용을 바꾼
              // 뒤 앱을 껐다 켜지 않아도 되도록 재시도 경로를 열어 둔다.
              <button
                type="button"
                onClick={() => { handledRef.current = false; startCamera(); }}
                style={{
                  width: '100%', marginTop: '10px', padding: '13px', background: 'none',
                  border: '1.5px solid rgba(255,255,255,.22)', borderRadius: '12px',
                  fontSize: '13.5px', fontWeight: 800, color: '#fff', cursor: 'pointer',
                }}
              >
                카메라 다시 시도
              </button>
            )}
            <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#8A8A7C', marginTop: '10px', lineHeight: 1.6 }}>
              {camState === 'denied'
                ? '설정에서 카메라 접근을 허용하면 바로 스캔할 수 있어.'
                : camState === 'no-detector'
                  ? '이 브라우저는 바코드 자동 인식을 지원하지 않아. 제품명으로 검색해 줘.'
                  : '이 기기에서는 카메라 스캔을 쓸 수 없어.'}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { stopCamera(); navigate('/search'); }}
            style={{
              width: '100%', textAlign: 'center', padding: '13px', background: 'none', border: 'none',
              fontSize: '13.5px', fontWeight: 800, color: '#8A8A7C', cursor: 'pointer',
            }}
          >
            제품명으로 직접 검색
          </button>
        )}
      </div>
    </div>
  );
}
