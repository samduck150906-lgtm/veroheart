// @ts-nocheck
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ScannerScreen from '../components/ScannerScreen';
import ImageCropScreen from '../components/ImageCropScreen';
import { useNavigate } from 'react-router-dom';
import { notify } from '../store/useNotification';

type FlowStep = 'scan' | 'crop';

export default function Scanner() {
  const navigate = useNavigate();
  const [step,       setStep      ] = useState<FlowStep>('scan');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'barcode' | 'text'>('barcode');
  const [ocr, setOcr] = useState<{ busy: boolean; label: string; ratio: number }>({
    busy: false,
    label: '',
    ratio: 0,
  });

  const handleCapture = (dataUrl: string, mode: 'barcode' | 'text') => {
    if (mode === 'text') {
      // Text/ingredient mode → go to crop screen for precision selection
      setCapturedUrl(dataUrl);
      setCaptureMode(mode);
      setStep('crop');
    } else {
      // Barcode mode is not yet implemented
      notify.info('바코드 스캔 기능은 준비 중입니다. 성분표 촬영 모드를 이용해 주세요.');
    }
  };

  const handleCropDone = async (base64: string) => {
    setOcr({ busy: true, label: '인식 엔진 준비 중', ratio: 0 });
    try {
      const { extractTextFromImage } = await import('../analysis/ocr');
      const text = await extractTextFromImage(base64, {
        langs: 'kor+eng',
        onProgress: (p) => setOcr({ busy: true, label: p.label, ratio: p.ratio }),
      });

      sessionStorage.setItem('pendingIngredientImage', base64);
      if (text && text.trim().length >= 5) {
        sessionStorage.setItem('pendingIngredientText', text);
        notify.success('성분 인식 완료! 결과를 확인해 주세요.');
      } else {
        notify.info('글자 인식이 어려웠어요. 직접 입력하거나 다시 촬영해 주세요.');
      }
    } catch (err) {
      console.error('[Scanner] OCR 실패:', err);
      notify.error('글자 인식에 실패했어요. 직접 입력 화면으로 이동합니다.');
    } finally {
      setOcr({ busy: false, label: '', ratio: 0 });
    }
    navigate('/scan-result');
  };

  return (
    <div style={{ padding: 0, height: '100dvh', overflow: 'hidden' }}>
      <Helmet>
        <title>AI 성분 스캐너 | 베로로</title>
        <meta name="description" content="사료 바코드 또는 성분표를 스캔해 AI 분석을 시작하세요." />
      </Helmet>

      {step === 'scan' && (
        <ScannerScreen onCapture={handleCapture} />
      )}

      {step === 'crop' && capturedUrl && (
        <ImageCropScreen
          imageSrc={capturedUrl}
          onDone={handleCropDone}
          onCancel={() => { setCapturedUrl(null); setStep('scan'); }}
        />
      )}

      {ocr.busy && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 32px', textAlign: 'center', color: '#fff',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
              animation: 'vh-ocr-spin 0.9s linear infinite', marginBottom: 22,
            }}
          />
          <p style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{ocr.label}</p>
          <p style={{ fontSize: 12.5, opacity: 0.75, margin: '6px 0 18px' }}>
            처음 인식할 때는 한글 데이터를 받느라 잠시 걸릴 수 있어요.
          </p>
          <div style={{ width: '100%', maxWidth: 280, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round(Math.max(0.05, ocr.ratio) * 100)}%`,
                background: 'linear-gradient(90deg,#34D399,#10B981)',
                borderRadius: 999, transition: 'width 0.25s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            {Math.round(ocr.ratio * 100)}%
          </span>
          <style>{`@keyframes vh-ocr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
