import { NextRequest, NextResponse } from 'next/server';

// 런타임에서 API 키를 업데이트하기 위한 임시 저장소
// 프로덕션에서는 DB나 환경변수 관리 서비스 사용 권장
const runtimeKeys: Record<string, string> = {};

export function getRuntimeKey(key: string): string | undefined {
  return runtimeKeys[key];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.voyageApiKey) {
      runtimeKeys['VOYAGE_API_KEY'] = body.voyageApiKey;
      // 런타임 환경변수 업데이트
      process.env.VOYAGE_API_KEY = body.voyageApiKey;
    }

    if (body.figmaApiToken) {
      runtimeKeys['FIGMA_API_TOKEN'] = body.figmaApiToken;
      process.env.FIGMA_API_TOKEN = body.figmaApiToken;
    }

    if (body.teamsAppId) {
      runtimeKeys['TEAMS_BOT_APP_ID'] = body.teamsAppId;
      process.env.TEAMS_BOT_APP_ID = body.teamsAppId;
    }

    if (body.teamsAppPassword) {
      runtimeKeys['TEAMS_BOT_APP_PASSWORD'] = body.teamsAppPassword;
      process.env.TEAMS_BOT_APP_PASSWORD = body.teamsAppPassword;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 });
  }
}

export async function GET() {
  // 키가 설정되어 있는지 여부만 반환 (값은 노출하지 않음)
  return NextResponse.json({
    voyageApiKey: !!process.env.VOYAGE_API_KEY,
    figmaApiToken: !!process.env.FIGMA_API_TOKEN,
    teamsAppId: !!process.env.TEAMS_BOT_APP_ID,
    teamsAppPassword: !!process.env.TEAMS_BOT_APP_PASSWORD,
  });
}
