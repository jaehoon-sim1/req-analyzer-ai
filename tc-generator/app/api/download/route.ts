import { NextRequest, NextResponse } from "next/server";
import { generateExcel } from "@/lib/excel";
import { TestSection } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sections, functionName } = body as {
      sections: TestSection[];
      functionName: string;
    };

    if (!sections || !sections.length) {
      return NextResponse.json(
        { error: "생성된 TC 데이터가 없습니다." },
        { status: 400 }
      );
    }

    const excelBuffer = await generateExcel(sections, functionName);

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`TestCase_${functionName}.xlsx`)}`,
      },
    });
  } catch (error) {
    console.error("Excel download error:", error);
    const message =
      error instanceof Error ? error.message : "Excel 생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
