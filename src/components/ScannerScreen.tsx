// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Camera, Scan, FileText, Zap } from 'lucide-react';
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

export default function ScannerScreen({ onCapture, onBarcodeDetect }: ScannerScreenProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);
  const detectedRef = useRef(false);

  const [error,          setError         ] = useState<string | null>(null);
  const [hasPermission,  setHasPermission ] = useState(false);
  const [flashActive,    setFlashActive   ] = useState(false);
  const [, setCaptured] = useState(false);
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

      {/* ── Top bar ── */}
      <div className="scanner-topbar">
        <span className="scanner-topbar-title">
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

          {/* Capture button */}
          <button className="scanner-capture-btn" onClick={handleCapture} aria-label="촬영">
            <Camera size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
