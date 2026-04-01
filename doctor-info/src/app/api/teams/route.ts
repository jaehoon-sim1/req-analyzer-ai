import { NextRequest, NextResponse } from 'next/server';
import { getTeamsAdapter } from '@/lib/teams/adapter';
import { DoctorInfoBot } from '@/lib/teams/bot';

const bot = new DoctorInfoBot();

// Teams Bot Framework 메시지 엔드포인트
export async function POST(request: NextRequest) {
  try {
    const adapter = getTeamsAdapter();

    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Bot Framework 요청 처리를 위한 가짜 req/res 객체
    const req = {
      body,
      headers,
      method: 'POST',
    };

    let responseBody = '';
    let responseStatus = 200;

    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      send: (data: string) => {
        responseBody = data;
        return res;
      },
      end: () => res,
    };

    await adapter.process(req as never, res as never, (context) =>
      bot.run(context)
    );

    return new NextResponse(responseBody || null, { status: responseStatus });
  } catch (err) {
    console.error('[Teams API] 오류:', err);
    return NextResponse.json(
      { error: 'Bot Framework 처리 실패' },
      { status: 500 }
    );
  }
}
