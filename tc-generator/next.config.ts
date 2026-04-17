import type { NextConfig } from "next";

const securityHeaders = [
  // CSP: XSS 방어 (인라인 스크립트는 Next.js에 필요하므로 unsafe-inline 허용)
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.figma.com https://openrouter.ai https://generativelanguage.googleapis.com https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "DENY" },
  // MIME 스니핑 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // XSS 필터
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Referrer 제어
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS 강제 (1년)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // 권한 정책 (카메라/마이크/위치 차단)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: ".",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
