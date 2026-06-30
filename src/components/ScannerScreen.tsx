// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Camera, Scan, FileText, X, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SCANNER_GUIDE } from '../copy/ui';

/**
 * ScannerScreen
 * - 카메라 권한 + 실시간 프리뷰
 * - 하단 토글: '바코드 스캔' | '성분표 촬영'
 * - 바코드 모드: BarcodeDetector API로 실시간 자동 감지
 * - 성분표 모드: 촬영 버튼 → 캡처 후 콜백(onCapture) 실행
 */
interface ScannerScreenProps {
  /** 성분표 촬영 완료 콜백 */
  onCapture?: (dataUrl: string, mode: 'barcode' | 'text') => void;
  /** 바코드 감지 성공 콜백 (rawValue) */
  onBarcodeDetect?: (barcode: string) => void;
  /** 닫기/뒤로가기 동작 (미지정 시 라우터 뒤로가기) */
  onClose?: () => void;
}

const MODES = [
  { id: 'barcode' as const, label: '바코드', icon: Scan, desc: SCANNER_GUIDE.hint2 },
  { id: 'text'    as const, label: '성분표', icon: FileText, desc: SCANNER_GUIDE.description },
];

// Bounding box sizes per mode (% of viewport)
const BOX_SIZE = {
  barcode: { w: '72%', h: '22%' },
  text:    { w: '88%', h: '64%' },
};

export default function ScannerScreen({ onCapture, onBarcodeDetect, onClose }: ScannerScreenProps) {
  const navigate = useNavigate();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);
  const detectedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 화면을 빠져나가는 단일 경로. onClose가 없으면 뒤로가기(없으면 홈).
  const handleClose = useCallback(() => {
    if (onClose) { onClose(); return; }
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }, [onClose, navigate]);

  // 사진 업로드(파일 선택) → 성분표 분석 흐름으로 진입. 카메라 거부/미지원 시 대체 경로.
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onCapture?.(reader.result, 'text');
    };
    reader.readAsDataURL(file);
  }, [onCapture]);

  const [error,          setError         ] = useState<string | null>(null);
  const [hasPermission,  setHasPermission ] = useState(false);
  const [flashActive,    setFlashActive   ] = useState(false);
  const [captured,       setCaptured      ] = useState(false);
  const [barcodeHint,    setBarcodeHint   ] = useState<string | null>(null);

  const scannerMode    = useStore((s) => s.scannerMode);
  const setScannerMode = useStore((s) => s.setScannerMode);

  // ── Camera setup ────────────────────────────────────────────────────
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setHasPermission(true);
      } catch {
        setError(`${SCANNER_GUIDE.permission.title}\n${SCANNER_GUIDE.permission.denied}`);
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Barcode real-time detection (BarcodeDetector API) ───────────────
  useEffect(() => {
    if (scannerMode !== 'barcode' || !hasPermission) return;

    // Reset detection state when entering barcode mode
    detectedRef.current = false;
    setBarcodeHint(null);

    if (!('BarcodeDetector' in window)) {
      setBarcodeHint('이 브라우저는 자동 감지를 지원하지 않아요. 촬영 버튼을 눌러 스캔하세요.');
      return;
    }

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
    });

    const scanFrame = async () => {
      if (detectedRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && !detectedRef.current) {
            detectedRef.current = true;
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 300);
            onBarcodeDetect?.(barcodes[0].rawValue);
            return;
          }
        } catch {
          // individual frame errors are expected — continue scanning
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    };

    rafRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scannerMode, hasPermission, onBarcodeDetect]);

  // ── Capture ─────────────────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Flash effect
    setFlashActive(true);
    setCaptured(true);
    setTimeout(() => setFlashActive(false), 300);

    onCapture?.(dataUrl, scannerMode);
  }, [scannerMode, onCapture]);

  const modeInfo = MODES.find((m) => m.id === scannerMode)!;
  const box      = BOX_SIZE[scannerMode];

  return (
    <div className="scanner-root">
      {/* ── Hidden canvas for capture ── */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Hidden file input (사진 업로드 대체 경로) ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* ── 닫기 버튼 — 항상 최상단에 노출(권한 거부/검은 화면에서도 빠져나갈 수 있게) ── */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="닫기"
        style={{
          position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: '14px',
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          border: 'none', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
        }}
      >
        <X size={22} strokeWidth={2.4} />
      </button>

      {/* ── Camera feed ── always rendered so srcObject can be set before hasPermission state updates */}
      <video
        ref={videoRef}
        className="scanner-video"
        muted autoPlay playsInline
        style={{ visibility: hasPermission ? 'visible' : 'hidden' }}
      />

      {/* ── Camera permission error ── */}
      {error && (
        <div className="scanner-error-overlay">
          <div className="scanner-error-card">
            <AlertTriangle size={40} className="scanner-error-icon" />
            <p className="scanner-error-text" style={{ whiteSpace: 'pre-line' }}>{error}</p>
            {/* CHANGED(P0-5): 카메라 거부/미지원 시 갇히지 않도록 대체 경로 + 탈출구 제공 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'var(--primary)', color: '#241B00', fontSize: '14.5px', fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}
              >
                🖼️ 사진으로 분석하기
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', cursor: 'pointer',
                  background: 'transparent', color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.25)', fontSize: '14px', fontWeight: 700,
                }}
              >
                뒤로 가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bounding box overlay ── */}
      {hasPermission && (
        <>
          {/* Dark vignette around bounding box */}
          <div className="scanner-vignette" />

          {/* Bounding box */}
          <div
            className={`scanner-bbox scanner-bbox--${scannerMode}`}
            style={{ width: box.w, height: box.h }}
          >
            <div className="scanner-corner tl" />
            <div className="scanner-corner tr" />
            <div className="scanner-corner bl" />
            <div className="scanner-corner br" />
            {/* Scan line */}
            <div className="scanner-scan-line" />
            {/* Label above box */}
            <div className="scanner-bbox-label">
              {scannerMode === 'barcode' ? '📦 바코드를 여기에' : '📋 성분표를 여기에'}
            </div>
          </div>

          {/* Helper text */}
          <div className="scanner-hint">
            {barcodeHint ?? modeInfo.desc}
          </div>
        </>
      )}

      {/* ── Flash effect ── */}
      {flashActive && <div className="scanner-flash" />}

      {/* ── Top bar ── (닫기 버튼 영역만큼 좌측 여백 확보) */}
      <div className="scanner-topbar">
        <span className="scanner-topbar-title" style={{ marginLeft: '46px' }}>
          <Zap size={16} style={{ marginRight: '6px', color: 'var(--primary)' }} />
          AI 성분 스캐너
        </span>
      </div>

      {/* ── Bottom controls ── */}
      {hasPermission && (
        <div className="scanner-controls">
          {/* Mode toggle */}
          <div className="scanner-mode-toggle">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = m.id === scannerMode;
              return (
                <button
                  key={m.id}
                  className={`scanner-mode-btn ${active ? 'scanner-mode-btn--active' : ''}`}
                  onClick={() => { setScannerMode(m.id); setCaptured(false); }}
                >
                  <Icon size={16} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Capture row: 사진 업로드 + 촬영 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', width: '100%' }}>
            {/* CHANGED(P0-5): 카메라가 동작해도 갤러리 사진으로 분석할 수 있는 대체 경로 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="사진 업로드"
              style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', color: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                fontSize: '9px', fontWeight: 700,
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>🖼️</span>
              업로드
            </button>

            <button className="scanner-capture-btn" onClick={handleCapture} aria-label="촬영">
              <Camera size={28} />
            </button>

            {/* 좌우 대칭용 스페이서 (촬영 버튼 가운데 정렬 유지) */}
            <span aria-hidden style={{ width: '52px', height: '52px', flexShrink: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}
