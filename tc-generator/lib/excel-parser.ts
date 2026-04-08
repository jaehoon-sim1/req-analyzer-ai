import ExcelJS from "exceljs";
import { ParsedTC, ParsedTCSection } from "./types";

// 컬럼명 매칭 규칙: 각 필드에 대해 여러 패턴 지원
const COLUMN_PATTERNS: Record<string, RegExp> = {
  tcNo: /tc\s*no|tc\s*번호|테스트\s*번호|no\.|번호/i,
  depth1: /depth\s*1|대분류|분류\s*1/i,
  depth2: /depth\s*2|중분류|분류\s*2/i,
  depth3: /depth\s*3|소분류|분류\s*3/i,
  depth4: /depth\s*4|세부분류|분류\s*4/i,
  depth5: /depth\s*5|최세부|분류\s*5/i,
  precondition: /precondition|사전\s*조건|전제\s*조건|선행\s*조건/i,
  procedure: /procedure|테스트\s*절차|절차|수행\s*절차|테스트\s*스텝|step/i,
  expectedResult: /expected|기대\s*결과|예상\s*결과|확인\s*사항|결과/i,
  docInfo: /doc\s*info|문서\s*정보|출처|참조/i,
  testType: /test\s*type|테스트\s*유형|유형|타입/i,
  testStatus: /test\s*status|상태|결과\s*상태/i,
  severity: /severity|심각도|중요도/i,
};


/**
 * 클라이언트에서 Excel(.xlsx) TC 파일을 파싱하여 ParsedTCSection[] 반환
 */
export async function parseExcelTC(file: File): Promise<ParsedTCSection[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  if (workbook.worksheets.length === 0) throw new Error("Excel 파일에 시트가 없습니다.");

  // 모든 시트를 검색하여 TC 헤더가 있는 시트를 찾음
  let ws: ExcelJS.Worksheet | null = null;
  let headerRow = -1;
  let colMap: Record<string, number> = {};
  let bestMatchCount = 0;

  // 1순위: TC 관련 이름의 시트부터 검색
  const sortedSheets = [...workbook.worksheets].sort((a, b) => {
    const tcPattern = /testcase|test\s*case|^tc|테스트/i;
    const aMatch = tcPattern.test(a.name) ? 0 : 1;
    const bMatch = tcPattern.test(b.name) ? 0 : 1;
    return aMatch - bMatch;
  });

  for (const sheet of sortedSheets) {
    // 병합 셀에서 실제 값 읽기
    function getCellValueFromSheet(s: ExcelJS.Worksheet, row: number, col: number): string {
      const cell = s.getCell(row, col);
      if (cell.value != null) return String(cell.value).trim();
      if (s.model.merges) {
        for (const range of s.model.merges) {
          const [startRef, endRef] = range.split(":");
          const startCell = s.getCell(startRef);
          const endCell = s.getCell(endRef);
          const sRow = Number(startCell.row);
          const sCol = Number(startCell.col);
          const eRow = Number(endCell.row);
          const eCol = Number(endCell.col);
          if (row >= sRow && row <= eRow && col >= sCol && col <= eCol) {
            return String(startCell.value || "").trim();
          }
        }
      }
      return "";
    }

    let sheetBestCount = 0;
    let sheetHeaderRow = -1;
    let sheetColMap: Record<string, number> = {};

    for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
      const cells: Record<string, number> = {};
      let matchCount = 0;

      for (let c = 1; c <= Math.min(40, sheet.columnCount); c++) {
        const val = getCellValueFromSheet(sheet, r, c).toLowerCase();
        if (!val) continue;
        for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
          if (!cells[field] && pattern.test(val)) {
            cells[field] = c;
            matchCount++;
          }
        }
      }

      if (matchCount > sheetBestCount && matchCount >= 2 && (cells["procedure"] || cells["tcNo"])) {
        sheetBestCount = matchCount;
        sheetHeaderRow = r;
        sheetColMap = { ...cells };
      }
    }

    // 이 시트가 전체 시트 중 최고 매칭이면 채택
    if (sheetBestCount > bestMatchCount) {
      bestMatchCount = sheetBestCount;
      headerRow = sheetHeaderRow;
      colMap = sheetColMap;
      ws = sheet;

      // 병합된 헤더 (2행에 걸친 경우) 처리
      if (headerRow > 0) {
        for (let c = 1; c <= Math.min(40, sheet.columnCount); c++) {
          const val = getCellValueFromSheet(sheet, headerRow + 1, c).toLowerCase();
          if (!val) continue;
          for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
            if (!colMap[field] && pattern.test(val)) {
              colMap[field] = c;
            }
          }
        }
      }
    }
  } // end for each sheet

  if (headerRow === -1 || !ws) {
    const sheetNames = workbook.worksheets.map((s) => `"${s.name}"`).join(", ");
    throw new Error(
      `TC 헤더를 찾을 수 없습니다.\n\n` +
      `검색한 시트: ${sheetNames} (총 ${workbook.worksheets.length}개)\n\n` +
      `지원하는 컬럼명:\n` +
      `• TC No., 번호\n• Procedure, 절차, 테스트 절차\n• Expected, 기대 결과\n• Depth 1~5, 대분류/중분류/소분류\n• Precondition, 사전조건\n• Doc info`
    );
  }

  console.log(`[excel-parser] 시트: "${ws.name}", 헤더 행: ${headerRow}, 매칭 컬럼:`, colMap);

  // 데이터 시작 행 결정 (headerRow+1 또는 headerRow+2 — 병합 헤더 대응)
  const dataStartRow = headerRow + (bestMatchCount > 0 ? 2 : 1);

  // 데이터 파싱
  const sections: ParsedTCSection[] = [];
  let currentSection: ParsedTCSection = { sectionTitle: "전체", testCases: [] };

  for (let r = dataStartRow; r <= ws.rowCount; r++) {
    const tcNo = getCellText(ws, r, colMap["tcNo"]);
    const procedure = getCellText(ws, r, colMap["procedure"]);

    // 빈 행 스킵
    if (!tcNo && !procedure) {
      const firstText = getFirstNonEmptyText(ws.getRow(r));
      if (firstText && firstText.length > 3) {
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
      docInfo: getCellText(ws, r, colMap["docInfo"]) || undefined,
    };

    currentSection.testCases.push(tc);
  }

  if (currentSection.testCases.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    throw new Error(`파싱된 TC가 없습니다.\n시트 "${ws.name}"에서 헤더(행 ${headerRow})를 찾았지만 데이터 행이 없습니다.`);
  }

  return sections;
}

function getCellText(ws: ExcelJS.Worksheet, row: number, col: number | undefined): string {
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
            `[${tc.tcNo}] ${[tc.depth1, tc.depth2, tc.depth3].filter(Boolean).join(" > ")}` +
            (tc.docInfo ? ` (출처: ${tc.docInfo})` : "") +
            `\n  절차: ${tc.procedure}\n` +
            `  기대결과: ${tc.expectedResult}`
        )
        .join("\n");
      return `## ${s.sectionTitle}\n${tcs}`;
    })
    .join("\n\n");
}
