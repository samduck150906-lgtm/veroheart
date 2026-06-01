// @ts-nocheck
import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * ImageCropScreen
 * - react-easy-crop 을 이용해 사진에서 분석 영역 지정
 * - 크롭 완료 → canvas 로 픽셀 추출 → Base64(JPEG) 문자열 생성
 * - onDone(base64) 콜백으로 부모에게 전달 (API 전송 준비)
 */
interface ImageCropScreenProps {
  /** 원본 이미지 data URL (camera capture) */
  imageSrc: string;
  /** 크롭 완료 시 Base64 문자열(data:image/jpeg;base64,...) 반환 */
  onDone: (base64: string) => void;
  /** 취소 / 다시 찍기 */
  onCancel: () => void;
}

/** getCroppedImg – canvas 로 크롭된 픽셀 영역을 추출해 base64 반환 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload  = () => resolve(image);
    image.onerror = reject;
    image.src     = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return canvas.toDataURL('image/jpeg', 0.92);
}

export default function ImageCropScreen({ imageSrc, onDone, onCancel }: ImageCropScreenProps) {
  const [crop,     setCrop    ] = useState({ x: 0, y: 0 });
  const [zoom,     setZoom    ] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading,  setLoading ] = useState(false);
  const croppedAreaPixels = useRef<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    croppedAreaPixels.current = pixels;
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels.current) return;
    setLoading(true);
    try {
      const base64 = await getCroppedImg(imageSrc, croppedAreaPixels.current);
      onDone(base64);
    } catch (e) {
      console.error('Crop failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crop-root">
      {/* Cropper area */}
      <div className="crop-canvas-area">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}         /* free-form crop */
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle : { borderColor: 'var(--primary)', borderWidth: 2 },
          }}
        />
      </div>

      {/* ── Guide label ── */}
      <div className="crop-hint">
        분석할 성분표 영역을 드래그하여 지정하세요
      </div>

      {/* ── Zoom controls ── */}
      <div className="crop-toolbar">
        <button className="crop-tool-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.2))} aria-label="축소">
          <ZoomOut size={20} />
        </button>
        <input
          className="crop-zoom-slider"
          type="range" min={1} max={3} step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <button className="crop-tool-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} aria-label="확대">
          <ZoomIn size={20} />
        </button>
        <button
          className="crop-tool-btn"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          aria-label="회전"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div className="crop-actions">
        <button className="crop-btn-cancel" onClick={onCancel}>
          다시 찍기
        </button>
        <button
          className="crop-btn-confirm"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? '처리 중…' : <><Check size={18} style={{ marginRight: 6 }} />분석 시작</>}
        </button>
      </div>
    </div>
  );
}
