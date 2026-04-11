import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fdfbf7",
          100: "#faf6ef",
          200: "#f0e8d9",
        },
        forest: {
          700: "#1b4d45",
          800: "#143d37",
          900: "#0e2e29",
        },
        sky: {
          soft: "#e8f2fb",
          DEFAULT: "#3d7ea6",
          deep: "#2a5f82",
        },
        peach: {
          soft: "#fde8e0",
          DEFAULT: "#e8a090",
          deep: "#c97a68",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -12px rgba(20, 61, 55, 0.12)",
        card: "0 8px 30px -8px rgba(20, 61, 55, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
