import { NextRequest, NextResponse } from "next/server";

/**
 * SharePoint/OneDrive 공유 URL을 직접 다운로드 URL로 변환
 *
 * 입력 예시:
 * https://gcpcloud-my.sharepoint.com/:x:/r/personal/gcwogns1028_gccorp_com/Documents/test.xlsx?d=w3344e79a...&csf=1&web=1
 *
 * 변환 결과:
 * https://gcpcloud-my.sharepoint.com/personal/gcwogns1028_gccorp_com/_layouts/15/download.aspx?SourceUrl=/personal/gcwogns1028_gccorp_com/Documents/test.xlsx
 */
function convertSharePointUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // SharePoint /:x:/r/ 패턴 감지
    // /:x:/r/personal/user/Documents/file.xlsx
    if (hostname.includes("sharepoint.com") && parsed.pathname.includes("/:x:/")) {
      // /:x:/r/ 이후 경로 추출
      const pathMatch = parsed.pathname.match(/\/:x:\/[rg]\/(.+)/);
      if (pathMatch) {
        const filePath = "/" + pathMatch[1];
        // download.aspx URL 생성
        const basePath = filePath.match(/^(\/personal\/[^/]+)/)?.[1] || "";
        if (basePath) {
          return `https://${hostname}${basePath}/_layouts/15/download.aspx?SourceUrl=${encodeURIComponent(filePath)}`;
        }
      }
    }

    // SharePoint /:x:/g/ (공유 링크) 패턴
    if (hostname.includes("sharepoint.com") && parsed.pathname.includes("/:x:/g/")) {
      // 이 패턴은 직접 다운로드가 어려움 → download=1 시도
      return url + (url.includes("?") ? "&" : "?") + "download=1";
    }

    // OneDrive 공유 링크
    if (hostname.includes("onedrive.live.com") || hostname.includes("1drv.ms")) {
      return url + (url.includes("?") ? "&" : "?") + "download=1";
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    // SharePoint URL 변환 시도
    const downloadUrl = convertSharePointUrl(url) || url;
    console.log("[fetch-excel] Original URL:", url.slice(0, 100));
    console.log("[fetch-excel] Download URL:", downloadUrl.slice(0, 100));

    const res = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!res.ok) {
      // 401/403이면 인증 필요 안내
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error:
              `접근 권한이 없습니다 (${res.status}).\n\n` +
              "SharePoint 파일의 공유 설정을 확인하거나,\n" +
              "Excel Online에서 '복사본 다운로드' 후 직접 업로드해주세요.",
          },
          { status: res.status }
        );
      }
      return NextResponse.json(
        { error: `파일 다운로드 실패 (${res.status}).` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    const buffer = await res.arrayBuffer();

    console.log("[fetch-excel] Response content-type:", contentType);
    console.log("[fetch-excel] Response size:", buffer.byteLength, "bytes");

    // Excel 파일 시그니처 확인 (PK = ZIP = XLSX)
    const sig = new Uint8Array(buffer.slice(0, 4));
    const isZip = sig[0] === 0x50 && sig[1] === 0x4B; // PK signature

    if (!isZip) {
      // HTML이나 기타 응답
      const textPreview = new TextDecoder().decode(buffer.slice(0, 200));
      console.log("[fetch-excel] Not a ZIP file. Preview:", textPreview.slice(0, 100));

      return NextResponse.json(
        {
          error:
            "Excel 파일을 다운로드할 수 없습니다.\n\n" +
            "SharePoint 파일은 인증이 필요하여 직접 다운로드가 제한됩니다.\n\n" +
            "대안:\n" +
            "1. Excel Online에서 파일 열기\n" +
            "2. 파일 → 복사본 다운로드\n" +
            "3. 다운로드한 .xlsx를 'Excel 업로드'로 업로드",
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
