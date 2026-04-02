import { NextRequest, NextResponse } from "next/server";
import {
  parseFigmaUrl,
  extractTextFromNodes,
  extractFrameGroups,
  FigmaNode,
} from "@/lib/figma";

// Corporate proxy SSL workaround (development only)
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { figmaUrl, figmaToken } = body;

    if (!figmaUrl || !figmaToken) {
      return NextResponse.json(
        { error: "Figma URL과 액세스 토큰이 필요합니다." },
        { status: 400 }
      );
    }

    const parsed = parseFigmaUrl(figmaUrl);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "올바른 Figma 페이지 URL을 입력해주세요. (예: https://www.figma.com/design/xxxxx/Name?node-id=0-1)",
        },
        { status: 400 }
      );
    }

    const { fileKey, nodeId } = parsed;

    // Figma API 호출 (rate limit 시 자동 재시도)
    const maxRetries = 3;
    let res: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      res = await fetch(
        `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
        {
          headers: {
            "X-Figma-Token": figmaToken,
          },
        }
      );

      if (res.status === 429) {
        if (attempt < maxRetries) {
          // Retry-After 헤더가 있으면 사용, 없으면 기본 대기
          const retryAfter = res.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : (attempt + 1) * 5000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return NextResponse.json(
          {
            error:
              "Figma API 요청 제한 초과 (Rate Limit). 30초~1분 후 다시 시도해주세요. " +
              "토큰 문제가 아닌 Figma 서버의 요청 횟수 제한입니다.",
          },
          { status: 429 }
        );
      }

      break;
    }

    if (!res || !res.ok) {
      const errBody = await res?.text().catch(() => "");
      console.error(`Figma API error - status: ${res?.status}, body: ${errBody}`);

      let errData: Record<string, unknown> = {};
      try {
        errData = JSON.parse(errBody || "{}");
      } catch {
        // not JSON
      }

      if (res?.status === 403) {
        // Figma는 rate limit을 403 + "Rate limit exceeded" 메시지로 반환하기도 함
        const errMsg = String(errData?.message || errData?.err || "");
        if (errMsg.toLowerCase().includes("rate limit")) {
          return NextResponse.json(
            {
              error:
                "Figma API 요청 제한 초과. 1~2분 후 다시 시도해주세요.\n" +
                "계속 발생하면 Figma에서 새 Personal Access Token을 발급해보세요.",
            },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            error:
              "Figma 액세스 토큰이 유효하지 않거나 해당 파일에 접근 권한이 없습니다.\n" +
              "토큰을 다시 확인하거나, Figma Settings에서 새로 발급해주세요.",
          },
          { status: 403 }
        );
      }
      if (res?.status === 404) {
        return NextResponse.json(
          { error: "Figma 파일을 찾을 수 없습니다. URL을 확인해주세요." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            errData?.message ||
            errData?.err ||
            `Figma API 오류 (${res?.status}): ${errBody?.slice(0, 200)}`,
        },
        { status: res?.status || 500 }
      );
    }

    const data = await res.json();
    const nodeData = data.nodes?.[nodeId];

    if (!nodeData?.document) {
      return NextResponse.json(
        { error: "해당 노드를 찾을 수 없습니다. URL의 node-id를 확인해주세요." },
        { status: 400 }
      );
    }

    const document = nodeData.document as FigmaNode;
    const pageName = document.name;
    const texts = extractTextFromNodes(document);
    const frames = extractFrameGroups(document);

    if (texts.length === 0 && frames.length === 0) {
      return NextResponse.json(
        {
          error:
            "해당 페이지에서 텍스트를 추출할 수 없습니다. 텍스트 레이어가 포함된 페이지를 선택해주세요.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      pageName,
      texts,
      frames,
      nodeCount: texts.length,
    });
  } catch (error) {
    console.error("Figma extract error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Figma 데이터 추출 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
