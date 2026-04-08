import { NextRequest, NextResponse } from "next/server";
import { generateComparison, AIProvider } from "@/lib/claude";
import { buildCompareUserPrompt } from "@/lib/compare-prompt";

export async function POST(request: NextRequest) {
  try {
    const { tcText, requirementText, apiKey, provider } = await request.json();

    if (!tcText || !requirementText) {
      return sseError("TC 데이터와 기획서 내용이 모두 필요합니다.");
    }

    if (!apiKey) {
      return sseError("API 키를 입력해주세요.");
    }

    const userPrompt = buildCompareUserPrompt(tcText, requirementText);
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          send({ type: "progress", percent: 10, message: "TC와 기획서 분석 중..." });

          let currentPercent = 10;
          const interval = setInterval(() => {
            if (currentPercent < 75) {
              currentPercent += 8;
              send({ type: "progress", percent: currentPercent, message: "비교 분석 중..." });
            }
          }, 4000);

          const result = await generateComparison(
            userPrompt,
            apiKey,
            (provider || "gemini") as AIProvider
          );

          clearInterval(interval);

          send({ type: "progress", percent: 90, message: "결과 정리 중..." });
          send({ type: "result", data: result });
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "비교 분석 중 오류가 발생했습니다.";
          send({ type: "error", error: message });
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sseError(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`)
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
