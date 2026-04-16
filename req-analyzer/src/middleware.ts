import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── 취약점 1: 유사 도메인 피싱 방지 (허용된 호스트만 접근 허용) ───
const ALLOWED_HOSTS = [
  'req-analyzer-ai.vercel.app',
  'localhost',
  '127.0.0.1',
];

// Preview 배포 도메인 패턴 (Vercel Preview URLs)
const VERCEL_PREVIEW_PATTERN = /^req-analyzer.*\.vercel\.app$/;

function isAllowedHost(host: string): boolean {
  const hostname = host.split(':')[0]; // 포트 제거
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  if (VERCEL_PREVIEW_PATTERN.test(hostname)) return true;
  return false;
}

// ─── 취약점 2: CSP 및 보안 헤더 설정 ───
function getSecurityHeaders(): Record<string, string> {
  return {
    // Content-Security-Policy: XSS 방어 핵심
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 번들에 필요
      "style-src 'self' 'unsafe-inline'", // Tailwind CSS에 필요
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://api.figma.com",
      "frame-ancestors 'none'", // 클릭재킹 방지
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),

    // XSS 필터 (레거시 브라우저용)
    'X-XSS-Protection': '1; mode=block',

    // MIME 타입 스니핑 방지
    'X-Content-Type-Options': 'nosniff',

    // 클릭재킹 방지
    'X-Frame-Options': 'DENY',

    // Referrer 정보 제한
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // HTTPS 강제 (1년)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // 브라우저 기능 제한 (카메라, 마이크, 위치정보 등)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

    // 외부에서 iframe 삽입 차단 (CSP frame-ancestors와 중복이지만 호환성용)
    'X-DNS-Prefetch-Control': 'off',

    // CORP/COOP (교차 출처 격리)
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // ─── 취약점 1: 호스트 검증 — 피싱 도메인 차단 ───
  if (host && !isAllowedHost(host)) {
    return new NextResponse(
      JSON.stringify({ error: '허용되지 않은 도메인입니다.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // ─── 취약점 3: admin 서브도메인 접근 차단 ───
  // /admin, /api/admin 등의 경로를 차단하여 관리자 엔드포인트 보호
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return new NextResponse(
      JSON.stringify({ error: '접근이 거부되었습니다.' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // ─── 보안 헤더 적용 ───
  const response = NextResponse.next();
  const securityHeaders = getSecurityHeaders();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // API 응답에 캐시 방지 (민감 데이터 보호)
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

// 모든 페이지와 API에 적용 (정적 파일 제외)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|mjs|js|css)$).*)',
  ],
};
