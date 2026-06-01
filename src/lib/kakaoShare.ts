const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: Record<string, unknown>) => void;
      };
    };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('WINDOW_UNAVAILABLE'));
  }
  if (window.Kakao) {
    return Promise.resolve();
  }
  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('KAKAO_SDK_LOAD_FAILED'));
      document.head.appendChild(script);
    });
  }
  return sdkLoadPromise;
}

export function getKakaoJavaScriptKey(): string | undefined {
  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

export function isKakaoShareConfigured(): boolean {
  return Boolean(getKakaoJavaScriptKey());
}

async function ensureKakaoReady(): Promise<NonNullable<Window['Kakao']>> {
  const key = getKakaoJavaScriptKey();
  if (!key) {
    throw new Error('KAKAO_KEY_MISSING');
  }
  await loadKakaoSdk();
  const Kakao = window.Kakao;
  if (!Kakao) {
    throw new Error('KAKAO_SDK_LOAD_FAILED');
  }
  if (!Kakao.isInitialized()) {
    Kakao.init(key);
  }
  return Kakao;
}

/** 카카오톡 공유 (템플릿: 텍스트 + 링크). text는 SDK 제한에 맞게 잘립니다. */
export async function kakaoShareTextWithLink(options: {
  text: string;
  linkUrl: string;
}): Promise<void> {
  const Kakao = await ensureKakaoReady();
  const url = options.linkUrl;
  const text = options.text.replace(/\s+/g, ' ').trim().slice(0, 200);

  Kakao.Share.sendDefault({
    objectType: 'text',
    text: text || '베로로 반려동물 성향 테스트',
    link: {
      mobileWebUrl: url,
      webUrl: url,
    },
  });
}
