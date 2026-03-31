import { NextRequest } from 'next/server';
import { analyzeRequirements } from '@/lib/analyzer';
import type { StreamEvent } from '@/types/analysis';

export const maxDuration = 180; // 180초 타임아웃 (NFR-001)

// In-memory rate limiter: max 5 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
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
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return Response.json(
        { error: '요구사항 텍스트를 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (text.trim().length < 10) {
      return Response.json(
        { error: '요구사항은 최소 10자 이상 입력해 주세요.' },
        { status: 400 }
      );
    }

    if (text.length > 100000) {
      return Response.json(
        { error: '입력 텍스트는 100,000자 이내여야 합니다.' },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await analyzeRequirements(text, (event: StreamEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          });

          // Send final result
          const finalEvent = `data: ${JSON.stringify({
            type: 'result',
            data: result,
          })}\n\n`;
          controller.enqueue(encoder.encode(finalEvent));
          controller.close();
        } catch (error) {
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
