import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TC Generator - TestCase 자동 생성",
  description: "요구사항을 입력하면 TestCase를 자동으로 생성합니다",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
