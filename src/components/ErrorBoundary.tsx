import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 전역 에러 바운더리.
 * 페이지 렌더링 중 처리되지 않은 오류가 발생해도 흰 화면(블랭크 스크린) 대신
 * 복구 가능한 안내 화면을 보여준다.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 콘솔에 기록해 두면 운영 중 원인 추적이 쉬워진다.
    console.error('[VeRoRo] Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#F7F4EE',
          padding: '32px 24px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #F5C518 0%, #E8A800 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 8px 24px rgba(245,197,24,0.3)',
            fontSize: 36,
          }}
        >
          🐾
        </div>
        <p style={{ color: '#191F28', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
          잠시 문제가 발생했어요
        </p>
        <p style={{ color: '#8B95A1', fontSize: '14px', fontWeight: 500, margin: '0 0 24px', maxWidth: 300, lineHeight: 1.55 }}>
          화면을 불러오는 중 오류가 생겼습니다. 다시 시도하거나 홈으로 이동해 주세요.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '12px 22px',
              borderRadius: 14,
              border: '1px solid #E5E0D5',
              background: '#FFFFFF',
              color: '#191F28',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 22px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #F5C518 0%, #E8A800 100%)',
              color: '#191F28',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
