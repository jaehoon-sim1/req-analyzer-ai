import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "요구사항 분석 AI",
  description: "소프트웨어 요구사항의 품질을 AI로 분석하고 개선점을 제안합니다",
  keywords: ["요구사항 분석", "AI", "QA", "소프트웨어 품질", "테스트"],
  openGraph: {
    title: "요구사항 분석 AI",
    description: "소프트웨어 요구사항의 품질을 AI로 분석하고 개선점을 제안합니다",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
