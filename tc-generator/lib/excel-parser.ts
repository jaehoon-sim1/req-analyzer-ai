import ExcelJS from "exceljs";
import { ParsedTC, ParsedTCSection } from "./types";

/**
 * 클라이언트에서 Excel(.xlsx) TC 파일을 파싱하여 ParsedTCSection[] 반환
 * TC Generator가 내보낸 형식 + 일반적인 TC Excel 형식 모두 지원
 */
export async function parseExcelTC(file: File): Promise<ParsedTCSection[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.worksheets[0];
  if (!ws) throw new Error("Excel 파일에 시트가 없습니다.");

  // 헤더 행 찾기: "TC No." 또는 "Procedure" 컬럼이 있는 행
  let headerRow = -1;
  let colMap: Record<string, number> = {};

  for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const cells: Record<string, number> = {};

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const val = String(cell.value || "").trim().toLowerCase();
      if (val.includes("tc no")) cells["tcNo"] = colNumber;
      if (val === "depth 1" || val === "depth1") cells["depth1"] = colNumber;
      if (val === "depth 2" || val === "depth2") cells["depth2"] = colNumber;
      if (val === "depth 3" || val === "depth3") cells["depth3"] = colNumber;
      if (val.includes("precondition") || val === "사전조건") cells["precondition"] = colNumber;
      if (val.includes("procedure") || val === "테스트 절차") cells["procedure"] = colNumber;
      if (val.includes("expected") || val === "기대 결과") cells["expectedResult"] = colNumber;
    });

    if (cells["procedure"] || cells["tcNo"]) {
      headerRow = r;
      colMap = cells;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error(
      "TC 헤더를 찾을 수 없습니다. 'TC No.', 'Procedure' 등의 컬럼이 필요합니다."
    );
  }

  // 데이터 파싱
  const sections: ParsedTCSection[] = [];
  let currentSection: ParsedTCSection = { sectionTitle: "전체", testCases: [] };

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const tcNo = getCellText(ws, r, colMap["tcNo"]);
    const procedure = getCellText(ws, r, colMap["procedure"]);

    // 빈 행 스킵
    if (!tcNo && !procedure) {
      // 섹션 헤더 감지: TC No 없고 다른 셀에 텍스트가 있으면
      const firstText = getFirstNonEmptyText(row);
      if (firstText && firstText.length > 3 && firstText.includes(">")) {
        if (currentSection.testCases.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { sectionTitle: firstText, testCases: [] };
      }
      continue;
    }

    if (!procedure) continue;

    const tc: ParsedTC = {
      tcNo: tcNo || `TC_${r}`,
      depth1: getCellText(ws, r, colMap["depth1"]) || undefined,
      depth2: getCellText(ws, r, colMap["depth2"]) || undefined,
      depth3: getCellText(ws, r, colMap["depth3"]) || undefined,
      precondition: getCellText(ws, r, colMap["precondition"]) || undefined,
      procedure,
      expectedResult: getCellText(ws, r, colMap["expectedResult"]) || "",
    };

    currentSection.testCases.push(tc);
  }

  if (currentSection.testCases.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    throw new Error("파싱된 TC가 없습니다. Excel 형식을 확인해주세요.");
  }

  return sections;
}

function getCellText(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number | undefined
): string {
  if (!col) return "";
  const cell = ws.getCell(row, col);
  return String(cell.value || "").trim();
}

function getFirstNonEmptyText(row: ExcelJS.Row): string {
  let text = "";
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (!text && cell.value) {
      text = String(cell.value).trim();
    }
  });
  return text;
}

/**
 * ParsedTCSection[]을 AI에 보낼 텍스트로 변환
 */
export function formatTCsForComparison(sections: ParsedTCSection[]): string {
  return sections
    .map((s) => {
      const tcs = s.testCases
        .map(
          (tc) =>
            `[${tc.tcNo}] ${[tc.depth1, tc.depth2, tc.depth3].filter(Boolean).join(" > ")}\n` +
            `  절차: ${tc.procedure}\n` +
            `  기대결과: ${tc.expectedResult}`
        )
        .join("\n");
      return `## ${s.sectionTitle}\n${tcs}`;
    })
    .join("\n\n");
}
