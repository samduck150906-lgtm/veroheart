import type { Config } from "tailwindcss";

/** 랜딩 메인: 진한 옐로우(골드/앰버). 텍스트는 가독용 딥 브라운/스톤. */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffdf7",
          100: "#fff9eb",
          200: "#ffefc4",
        },
        /** 본문·제목용 (녹색 톤 제거) */
        ink: {
          700: "#57534e",
          800: "#44403c",
          900: "#1c1917",
        },
        /** 메인 브랜드 — 진한 옐로우 / 골드 */
        gold: {
          soft: "#fff8e1",
          muted: "#fde68a",
          DEFAULT: "#d97706",
          deep: "#b45309",
          darker: "#92400e",
          darkest: "#78350f",
        },
        /**
         * 기존 클래스명 호환: sky-* → 골드 포인트,
         * forest-* → 잉크(중립)로 매핑해 한 번에 톤 전환
         */
        forest: {
          700: "#57534e",
          800: "#44403c",
          900: "#1c1917",
        },
        sky: {
          soft: "#fffbeb",
          DEFAULT: "#d97706",
          deep: "#b45309",
        },
        peach: {
          soft: "#fef3c7",
          DEFAULT: "#f59e0b",
          deep: "#d97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -12px rgba(180, 83, 9, 0.18)",
        card: "0 8px 30px -8px rgba(146, 64, 14, 0.1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
