import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `파일 다운로드 실패 (${res.status}). URL이 공유 링크인지 확인해주세요.` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const buffer = await res.arrayBuffer();

    // HTML 응답이면 로그인 페이지 또는 리디렉션
    if (contentType.includes("text/html") || new Uint8Array(buffer.slice(0, 5)).toString() === "60,33,68,79,67") {
      return NextResponse.json(
        {
          error:
            "Excel 파일 대신 웹 페이지가 반환되었습니다.\n\n" +
            "Microsoft 365 Excel은 직접 다운로드 URL이 필요합니다.\n" +
            "→ Excel Online에서 파일 열기 → 파일 → 복사본 다운로드\n" +
            "→ 다운로드한 .xlsx 파일을 'Excel 업로드'로 업로드해주세요.",
        },
        { status: 400 }
      );
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Excel 파일 가져오기 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
