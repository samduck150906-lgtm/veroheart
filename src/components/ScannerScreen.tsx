import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ScannerScreen – 카메라 권한 요청 → 실시간 프리뷰 + 중앙 사각형 가이드라인
 * - `navigator.mediaDevices.getUserMedia` 로 카메라 스트림을 얻고 <video>에 연결
 * - 권한 거부 시 사용자에게 안내 메시지 표시
 * - 화면 중앙에 투명 배경 + 테두리 (Bounding Box) overlay
 * - 네 모서리마다 스캔 라인 애니메이션 (CSS keyframes) 구현
 * - 컴포넌트가 언마운트될 때 스트림을 정리하여 메모리 누수 방지
 */
export default function ScannerScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // 요청 권한 & 스트림 획득
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setHasPermission(true);
      } catch (e) {
        console.error(e);
        setError('카메라 접근 권한이 필요합니다. 브라우저 설정을 확인해 주세요.');
        setHasPermission(false);
      }
    }
    startCamera();
    // Cleanup on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Video preview */}
      {hasPermission && (
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          muted
          autoPlay
          playsInline
        />
      )}

      {/* 오류 메시지 */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={48} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <p>{error}</p>
        </div>
      )}

      {/* Bounding box overlay */}
      {hasPermission && (
        <div
          className="scanner-bounding-box"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '68%',
            height: '45%',
            transform: 'translate(-50%, -50%)',
            border: '2px solid rgba(255,255,255,0.6)',
            borderRadius: '8px',
            boxSizing: 'border-box',
          }}
        >
          {/* Corner animations */}
          <div className="corner top-left" />
          <div className="corner top-right" />
          <div className="corner bottom-left" />
          <div className="corner bottom-right" />
        </div>
      )}
    </div>
  );
}

/* CSS for corner scan animation – inject via a <style> tag if not in global CSS */
const style = document.createElement('style');
style.innerHTML = `
  .scanner-bounding-box .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--primary);
    border-color: transparent;
  }
  .scanner-bounding-box .top-left {
    top: -2px; left: -2px; border-top-color: var(--primary); border-left-color: var(--primary);
    animation: scanCorner 1.2s infinite;
  }
  .scanner-bounding-box .top-right {
    top: -2px; right: -2px; border-top-color: var(--primary); border-right-color: var(--primary);
    animation: scanCorner 1.2s infinite 0.3s;
  }
  .scanner-bounding-box .bottom-left {
    bottom: -2px; left: -2px; border-bottom-color: var(--primary); border-left-color: var(--primary);
    animation: scanCorner 1.2s infinite 0.6s;
  }
  .scanner-bounding-box .bottom-right {
    bottom: -2px; right: -2px; border-bottom-color: var(--primary); border-right-color: var(--primary);
    animation: scanCorner 1.2s infinite 0.9s;
  }
  @keyframes scanCorner {
    0% { transform: scale(0.6); opacity: 0.3; }
    50% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.6); opacity: 0.3; }
  }
`;
document.head.appendChild(style);
