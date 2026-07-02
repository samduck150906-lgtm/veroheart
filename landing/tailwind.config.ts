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
        /** 보조 포인트 — 따뜻한 코랄/선셋으로 그라디언트 대비 */
        ember: {
          soft: "#ffedd5",
          DEFAULT: "#f97316",
          deep: "#ea580c",
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
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #ea580c 100%)",
        "gold-radial":
          "radial-gradient(120% 120% at 50% 0%, #fff9eb 0%, #fff3d6 40%, #ffe6b0 100%)",
        "hero-mesh":
          "radial-gradient(60% 70% at 15% 10%, rgba(251,191,36,0.35) 0%, transparent 60%), radial-gradient(55% 65% at 90% 15%, rgba(249,115,22,0.22) 0%, transparent 60%), radial-gradient(70% 80% at 60% 100%, rgba(253,230,138,0.45) 0%, transparent 65%)",
        "dot-grid":
          "radial-gradient(rgba(146,64,14,0.14) 1px, transparent 1px)",
        "grid-lines":
          "linear-gradient(to right, rgba(146,64,14,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(146,64,14,0.06) 1px, transparent 1px)",
        "sheen":
          "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)",
      },
      boxShadow: {
        soft: "0 18px 50px -12px rgba(180, 83, 9, 0.18)",
        card: "0 8px 30px -8px rgba(146, 64, 14, 0.1)",
        glow: "0 20px 60px -12px rgba(217, 119, 6, 0.45)",
        "glow-lg": "0 30px 90px -20px rgba(234, 88, 12, 0.5)",
        float: "0 24px 70px -18px rgba(120, 53, 15, 0.28)",
      },
      keyframes: {
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "float-y-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-22px)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(24px, -30px) scale(1.08)" },
          "66%": { transform: "translate(-20px, 18px) scale(0.94)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.5)", opacity: "0" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "float-y": "float-y 6s ease-in-out infinite",
        "float-y-slow": "float-y-slow 9s ease-in-out infinite",
        blob: "blob 16s ease-in-out infinite",
        "blob-slow": "blob 22s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        marquee: "marquee 28s linear infinite",
        "pulse-ring": "pulse-ring 2.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
