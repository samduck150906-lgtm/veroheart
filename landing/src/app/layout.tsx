import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeRoRo · 베로로 — 반려동물 성분 분석과 찐 리뷰",
  description:
    "사료 성분표 OCR 분석, 투명한 리뷰, 맞춤 커머스까지. 베로로에서 우리 아이 식단을 한 번에 확인하세요.",
  openGraph: {
    title: "VeRoRo · 베로로",
    description:
      "어려운 사료 성분표부터 깐깐한 반려인들의 진짜 리뷰까지. 베로로에서 한 번에 확인하세요.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#b45309",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={jakarta.variable}>
      <body className="bg-cream-50 font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
