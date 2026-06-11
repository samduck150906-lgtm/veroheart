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
      // Barcode mode is not yet implemented
      notify.info('바코드 스캔 기능은 준비 중입니다. 성분표 촬영 모드를 이용해 주세요.');
    }
  };

  const handleCropDone = async (base64: string) => {
    notify.info('성분표 글자를 인식하는 중이에요…');
    try {
      const { extractTextFromImage } = await import('../analysis/ocr');
      const text = await extractTextFromImage(base64, { langs: 'kor+eng' });

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
    </div>
  );
}
