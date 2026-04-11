/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_TOSS_WIDGET_CLIENT_KEY?: string;
    readonly VITE_KAKAO_JAVASCRIPT_KEY?: string;
    /** 쉼표로 구분한 관리자 이메일(소문자로 비교). 예: a@x.com,b@x.com */
    readonly VITE_ADMIN_EMAILS?: string;
  }
}

/** 다음 우편번호 스크립트 로드 후 주입 */
interface DaumPostcodeAddress {
  roadAddress?: string;
  jibunAddress?: string;
}

interface DaumPostcode {
  new (options: { oncomplete: (data: DaumPostcodeAddress) => void }): { open: () => void };
}

declare global {
  interface Window {
    daum?: { Postcode?: DaumPostcode };
  }
}

export {};
