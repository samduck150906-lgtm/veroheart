import type { Config } from "tailwindcss";

/**
 * 베로로 랜딩 톤 v2 — 플랫, 에디토리얼, 절제된 무드.
 * 그라디언트·글로우·전면 테두리 카드를 없애고 여백과 타이포그래피 대비로 위계를 만든다.
 * 브랜드 옐로우(accent)는 CTA 배경 1곳에만 단색으로 사용한다.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        sand: "#f6f2ea",
        /** 본문·제목용 잉크(중립, 웜톤 최소화) */
        ink: {
          950: "#15140f",
          900: "#201d17",
          700: "#4a453c",
          500: "#847c6d",
          300: "#c9c2b3",
        },
        /** 브랜드 포인트 — CTA 배경 1곳에만, 항상 단색으로 */
        accent: {
          soft: "#f6e9c8",
          DEFAULT: "#c2810a",
          dark: "#986707",
        },
        /** 하위호환: 기존 gold-* 참조를 accent로 매핑 */
        gold: {
          soft: "#f6e9c8",
          muted: "#e9d6a3",
          DEFAULT: "#c2810a",
          deep: "#986707",
          darker: "#7c5506",
          darkest: "#5f4105",
        },
        /** 분석 결과 상태색 — 실제 분석 예시에만, 저채도로 */
        safe: { soft: "#e6efe4", DEFAULT: "#4a7a4f", deep: "#345938" },
        caution: { soft: "#f3ecdc", DEFAULT: "#96731c", deep: "#6f5514" },
        risk: { soft: "#f4e5e0", DEFAULT: "#a5493a", deep: "#7c352a" },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(21, 20, 15, 0.06), 0 12px 28px -18px rgba(21, 20, 15, 0.16)",
        card: "0 1px 2px rgba(21, 20, 15, 0.05)",
      },
      keyframes: {
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "float-y": "float-y 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
