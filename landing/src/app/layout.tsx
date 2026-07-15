import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://veroro.life";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "베로로 VeRoRo | 반려동물 사료·간식 성분분석 앱",
  description:
    "사료와 간식의 원재료와 영양정보를 쉽게 확인하고, 반려동물의 알레르기와 건강 정보를 반영해 분석하는 베로로. 현재 정식 출시를 준비하고 있습니다.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "베로로 VeRoRo | 반려동물 사료·간식 성분분석 앱",
    description:
      "제품명이나 성분표 촬영으로 원재료, 영양정보, 알레르기 주의사항을 우리 아이 기준으로 확인하세요. 정식 출시를 준비하고 있습니다.",
    type: "website",
    url: SITE_URL,
    siteName: "VeRoRo 베로로",
    locale: "ko_KR",
    images: [{ url: "/veroro-logo.png", width: 594, height: 594, alt: "VeRoRo 베로로" }],
  },
  twitter: {
    card: "summary",
    title: "베로로 VeRoRo | 반려동물 사료·간식 성분분석 앱",
    description:
      "사료·간식 성분표를 우리 아이 기준으로 쉽게 분석해요. 정식 출시 준비 중.",
    images: ["/veroro-logo.png"],
  },
  icons: {
    icon: "/veroro-logo.png",
    apple: "/veroro-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fffdf9",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "이터널식스",
    url: SITE_URL,
    logo: `${SITE_URL}/veroro-logo.png`,
    email: "veroro@eternalsix.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VeRoRo 베로로",
    url: SITE_URL,
    inLanguage: "ko-KR",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "베로로는 언제 출시되나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "현재 정식 출시를 준비하고 있어요. 출시 알림을 신청하면 베타테스트와 출시 일정을 가장 먼저 안내해 드려요.",
        },
      },
      {
        "@type": "Question",
        name: "분석 결과가 수의사의 진단을 대신하나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "아니요. 베로로는 제품의 공개된 성분과 영양정보를 이해하기 쉽게 정리해 드리는 서비스이며, 질병의 진단이나 치료가 필요한 경우 수의사와 상담해야 합니다.",
        },
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-cream-50 font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
