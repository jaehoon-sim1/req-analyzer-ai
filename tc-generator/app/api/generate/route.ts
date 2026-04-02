import { NextRequest, NextResponse } from "next/server";
import { generateTestCases, AIProvider } from "@/lib/claude";
import { generateExcel } from "@/lib/excel";
import {
  buildUserPrompt,
  buildPdfUserPrompt,
  buildImageUserPrompt,
  buildFigmaUserPrompt,
  buildRegeneratePrompt,
} from "@/lib/prompt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      functionName,
      description,
      policies,
      pdfText,
      imageBase64,
      figmaText,
      mode,
      apiKey,
      provider,
      stream,
      feedback,
      previousResult,
    } = body;

    let userPrompt: string;
    let excelTitle: string;

    if (mode === "figma") {
      if (!figmaText) {
        return stream
          ? sseError("Figma 텍스트 데이터가 비어있습니다.")
          : NextResponse.json(
              { error: "Figma 텍스트 데이터가 비어있습니다." },
              { status: 400 }
            );
      }
      userPrompt = buildFigmaUserPrompt(figmaText);
      excelTitle = "Figma 디자인";
    } else if (mode === "image") {
      if (!imageBase64) {
        return stream
          ? sseError("이미지 데이터가 비어있습니다.")
          : NextResponse.json(
              { error: "이미지 데이터가 비어있습니다." },
              { status: 400 }
            );
      }
      userPrompt = buildImageUserPrompt();
      excelTitle = "이미지 요구사항";
    } else if (mode === "pdf") {
      if (!pdfText) {
        return stream
          ? sseError("PDF 텍스트가 비어있습니다.")
          : NextResponse.json(
              { error: "PDF 텍스트가 비어있습니다." },
              { status: 400 }
            );
      }
      userPrompt = buildPdfUserPrompt(pdfText);
      excelTitle = "PDF 요구사항";
    } else {
      if (!functionName || !description) {
        return stream
          ? sseError("기능명과 기능 상세 설명은 필수입니다.")
          : NextResponse.json(
              { error: "기능명과 기능 상세 설명은 필수입니다." },
              { status: 400 }
            );
      }
      userPrompt = buildUserPrompt(functionName, description, policies || "");
      excelTitle = functionName;
    }

    // 재생성 모드: 피드백이 있으면 이전 결과 + 피드백을 포함한 프롬프트로 래핑
    if (feedback && previousResult) {
      userPrompt = buildRegeneratePrompt(
        userPrompt,
        previousResult,
        feedback
      );
    }

    // SSE streaming mode
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (data: Record<string, unknown>) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          };

          try {
            // Stage 1: Analyzing
            send({
              type: "progress",
              stage: "analyzing",
              percent: 10,
              message: "요구사항 분석 중...",
            });

            // Stage 2: Generating — start timer for simulated progress
            send({
              type: "progress",
              stage: "generating",
              percent: 25,
              message: "테스트 케이스 생성 중...",
            });

            let currentPercent = 25;
            const interval = setInterval(() => {
              if (currentPercent < 75) {
                currentPercent += 8;
                send({
                  type: "progress",
                  stage: "generating",
                  percent: Math.min(currentPercent, 75),
                  message: "테스트 케이스 생성 중...",
                });
              }
            }, 4000);

            // Actual AI call
            const sections = await generateTestCases(
              userPrompt,
              apiKey,
              (provider || "gemini") as AIProvider,
              imageBase64
            );

            clearInterval(interval);

            // Stage 3: Finalizing
            send({
              type: "progress",
              stage: "finalizing",
              percent: 90,
              message: "결과 정리 중...",
            });

            send({
              type: "result",
              sections,
              functionName: excelTitle,
            });

            controller.close();
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다.";
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
    }

    // Non-streaming mode (backward compatible)
    const sections = await generateTestCases(
      userPrompt,
      apiKey,
      (provider || "gemini") as AIProvider,
      imageBase64
    );

    if (body.preview) {
      return NextResponse.json({ sections, functionName: excelTitle });
    }

    const excelBuffer = await generateExcel(sections, excelTitle);

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`TestCase_${excelTitle}.xlsx`)}`,
      },
    });
  } catch (error) {
    console.error("TC generation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sseError(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
        )
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
