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

  const handleCapture = (dataUrl: string, mode: 'barcode' | 'text') => {
    if (mode === 'text') {
      // Text/ingredient mode → go to crop screen for precision selection
      setCapturedUrl(dataUrl);
      setCaptureMode(mode);
      setStep('crop');
    } else {
      // Barcode mode → simulate decode & navigate
      notify.info('바코드를 인식 중입니다…');
      setTimeout(() => notify.success('바코드 인식 완료! 상품을 찾는 중…'), 1200);
    }
  };

  const handleCropDone = (base64: string) => {
    // In production: POST base64 to /api/analyze-ingredients
    console.info('[Scanner] Crop complete, base64 length:', base64.length);
    notify.success('이미지 처리 완료! 분석 결과로 이동합니다.');
    // Navigate to analysis result (pass via sessionStorage for demo)
    sessionStorage.setItem('pendingIngredientImage', base64);
    navigate('/analysis');
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
    </div>
  );
}
