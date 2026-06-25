/** @type {import('tailwindcss').Config} */
// CHANGED: Tailwind 신규 도입. 기존 3,400줄 자체 CSS 디자인 시스템을 보호하기 위해
//          preflight(전역 리셋)를 비활성화 — 유틸리티 클래스만 추가로 동작한다.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
