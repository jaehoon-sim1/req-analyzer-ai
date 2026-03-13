import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "요구사항 분석 AI",
  description: "소프트웨어 요구사항의 품질을 AI로 분석하고 개선점을 제안합니다",
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
