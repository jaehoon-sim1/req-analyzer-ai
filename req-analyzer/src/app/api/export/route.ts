import { NextRequest } from 'next/server';
import type { AnalysisResult } from '@/types/analysis';
import { exportToExcel } from '@/lib/export/excel';

// In-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return Response.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { result, format } = body as { result: AnalysisResult; format: 'excel' | 'json' };

    if (!result || typeof result !== 'object') {
      return Response.json(
        { error: '분석 결과가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!format || !['excel', 'json'].includes(format)) {
      return Response.json(
        { error: "format은 'excel' 또는 'json'이어야 합니다." },
        { status: 400 }
      );
    }

    if (format === 'excel') {
      const buffer = await exportToExcel(result);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="analysis-result.xlsx"',
          'Content-Length': String(buffer.length),
        },
      });
    }

    // JSON export
    const jsonContent = JSON.stringify(result, null, 2);
    const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
    return new Response(jsonBuffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="analysis-result.json"',
        'Content-Length': String(jsonBuffer.length),
      },
    });
  } catch (error) {
    return Response.json(
      { error: '내보내기 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
