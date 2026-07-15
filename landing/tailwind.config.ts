import type { Config } from "tailwindcss";

/**
 * 베로로 랜딩 톤: 흰색/연한 웜그레이 배경 + 브랜드 옐로우는 CTA·포인트에만.
 * 섹션마다 원색 배경, 네온, 금속광택, 과도한 그림자는 사용하지 않는다.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffdf9",
          100: "#faf6ee",
          200: "#f3ecdd",
        },
        /** 본문·제목용 잉크(중립) */
        ink: {
          700: "#57534e",
          800: "#44403c",
          900: "#1c1917",
        },
        /** 메인 브랜드 — CTA·포인트 전용 옐로우/골드 */
        gold: {
          soft: "#fdf3d9",
          muted: "#f0d78c",
          DEFAULT: "#c8860a",
          deep: "#a86a08",
          darker: "#8a5607",
          darkest: "#6b4306",
        },
        /** 분석 결과 상태색 — 실제 분석 예시에만 사용 */
        safe: { soft: "#e8f4ea", DEFAULT: "#2f8f4e", deep: "#1f6636" },
        caution: { soft: "#fdf1de", DEFAULT: "#c07a12", deep: "#8f5a0c" },
        risk: { soft: "#fbe9e7", DEFAULT: "#c94a3c", deep: "#9c372c" },
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
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #d99a1f 0%, #c8860a 100%)",
        "warm-fade":
          "radial-gradient(120% 100% at 50% 0%, #fdf3d9 0%, #fffdf9 55%)",
      },
      boxShadow: {
        soft: "0 12px 32px -16px rgba(28, 25, 23, 0.16)",
        card: "0 4px 18px -6px rgba(28, 25, 23, 0.08)",
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
