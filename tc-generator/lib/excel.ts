import ExcelJS from "exceljs";
import { TestSection } from "./types";

const FONT_NAME = "맑은 고딕";
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

function applyBorderRange(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
  }
}

export async function generateExcel(
  sections: TestSection[],
  functionName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // --- TestCase Sheet ---
  const ws = workbook.addWorksheet("TestCase");

  // Column widths
  ws.getColumn(1).width = 0.75; // A
  ws.getColumn(2).width = 0.75; // B
  ws.getColumn(3).width = 12; // C - Story ID
  ws.getColumn(4).width = 15.625; // D - TC No.
  ws.getColumn(5).width = 9.75; // E - Depth1
  ws.getColumn(6).width = 9.75; // F - Depth2
  ws.getColumn(7).width = 9.75; // G - Depth3
  ws.getColumn(8).width = 9.75; // H - Depth4
  ws.getColumn(9).width = 9.75; // I - Depth5
  ws.getColumn(10).width = 9.75; // J - Test Type
  ws.getColumn(11).width = 9.75; // K - Precondition
  ws.getColumn(12).width = 9.75; // L
  ws.getColumn(13).width = 9.75; // M
  ws.getColumn(14).width = 9.75; // N - Procedure
  ws.getColumn(15).width = 9.75;
  ws.getColumn(16).width = 9.75;
  ws.getColumn(17).width = 9.75;
  ws.getColumn(18).width = 9.75;
  ws.getColumn(19).width = 14.75; // S - Expected Results
  ws.getColumn(20).width = 9.75;
  ws.getColumn(21).width = 9.75;
  ws.getColumn(22).width = 14.75; // V - Confirm
  ws.getColumn(23).width = 9.75; // W - Actual Results
  ws.getColumn(24).width = 9.75;
  ws.getColumn(25).width = 9.75;
  ws.getColumn(26).width = 10.625; // Z - Severity
  ws.getColumn(27).width = 10.625; // AA - Test Status
  ws.getColumn(28).width = 10.625; // AB - Doc info
  ws.getColumn(29).width = 10.625; // AC - Doc Page
  ws.getColumn(30).width = 10.625; // AD - Desc No
  ws.getColumn(31).width = 10.625; // AE - AUTO
  ws.getColumn(32).width = 10.625; // AF - Redmine

  // Row 1-2: spacing
  ws.getRow(1).height = 7.5;
  ws.getRow(2).height = 4.5;

  // Row 3: Title
  ws.getRow(3).height = 39.75;
  ws.mergeCells("C3:AF3");
  const titleCell = ws.getCell("C3");
  titleCell.value = functionName;
  titleCell.font = { name: FONT_NAME, size: 28, bold: true };
  titleCell.alignment = { vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB4C6E7" },
  };

  // Row 4: spacing
  ws.getRow(4).height = 9.75;

  // Row 5-6: Summary headers
  ws.getRow(5).height = 16.5;
  ws.getRow(6).height = 16.5;
  ws.mergeCells("D5:D6");
  ws.getCell("D5").value = "Item";
  ws.getCell("D5").font = { name: FONT_NAME, size: 10, bold: true };
  ws.getCell("D5").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("D5").border = THIN_BORDER;

  ws.mergeCells("E5:I5");
  ws.getCell("E5").value = "Test Result";
  ws.getCell("E5").font = { name: FONT_NAME, size: 10, bold: true };
  ws.getCell("E5").alignment = { horizontal: "center", vertical: "middle" };
  applyBorderRange(ws, 5, 5, 5, 9);

  ws.mergeCells("J5:M5");
  ws.getCell("J5").value = "Severity Statistic";
  ws.getCell("J5").font = { name: FONT_NAME, size: 10, bold: true };
  ws.getCell("J5").alignment = { horizontal: "center", vertical: "middle" };
  applyBorderRange(ws, 5, 5, 10, 13);

  const summaryHeaders = [
    { col: 5, label: "PASSED" },
    { col: 6, label: "FAILED" },
    { col: 7, label: "BL" },
    { col: 8, label: "NR" },
    { col: 9, label: "NI" },
    { col: 10, label: "Critical" },
    { col: 11, label: "Major" },
    { col: 12, label: "Average" },
    { col: 13, label: "Minor" },
  ];

  for (const h of summaryHeaders) {
    const cell = ws.getCell(6, h.col);
    cell.value = h.label;
    cell.font = { name: FONT_NAME, size: 9, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  }

  // Row 7: Summary formulas
  ws.getRow(7).height = 30;
  ws.getCell("D7").value = {
    formula: "SUM(E7:I7)",
    result: 0,
  } as ExcelJS.CellFormulaValue;
  ws.getCell("D7").font = { name: FONT_NAME, size: 10, bold: true };
  ws.getCell("D7").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("D7").border = THIN_BORDER;

  const countifCols = [
    { col: 5, status: "PASSED" },
    { col: 6, status: "FAILED" },
    { col: 7, status: "BL" },
    { col: 8, status: "NR" },
    { col: 9, status: "NI" },
  ];

  for (const c of countifCols) {
    const cell = ws.getCell(7, c.col);
    cell.value = {
      formula: `COUNTIF($AA$11:$AA9615,"${c.status}")`,
      result: 0,
    } as ExcelJS.CellFormulaValue;
    cell.font = { name: FONT_NAME, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  }

  const severityCols = [
    { col: 10, level: "Critical" },
    { col: 11, level: "Major" },
    { col: 12, level: "Average" },
    { col: 13, level: "Minor" },
  ];

  for (const s of severityCols) {
    const cell = ws.getCell(7, s.col);
    cell.value = {
      formula: `COUNTIF($Z$11:$Z9615,"${s.level}")`,
      result: 0,
    } as ExcelJS.CellFormulaValue;
    cell.font = { name: FONT_NAME, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  }

  // Row 8: spacing
  ws.getRow(8).height = 9.75;

  // Row 9-10: Column headers
  ws.getRow(9).height = 9.75;
  ws.getRow(10).height = 11.25;

  const headerFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF999999" },
  };

  const headers: { col: number; endCol?: number; label: string }[] = [
    { col: 3, label: "Story ID" },
    { col: 4, label: "TC No." },
    { col: 5, label: "Depth 1" },
    { col: 6, label: "Depth 2" },
    { col: 7, label: "Depth 3" },
    { col: 8, label: "Depth 4" },
    { col: 9, label: "Depth 5" },
    { col: 10, label: "Test Type" },
    { col: 11, endCol: 13, label: "Precondition" },
    { col: 14, endCol: 18, label: "Procedure" },
    { col: 19, endCol: 21, label: "Expected Results" },
    { col: 22, label: "Confirm" },
    { col: 23, endCol: 25, label: "Actual Results" },
    { col: 26, label: "Severity" },
    { col: 27, label: "Test Status" },
    { col: 28, label: "Doc info" },
    { col: 29, label: "Doc Page" },
    { col: 30, label: "Desc No" },
    { col: 31, label: "AUTO" },
    { col: 32, label: "Redmine" },
  ];

  for (const h of headers) {
    const endCol = h.endCol || h.col;
    if (endCol > h.col) {
      ws.mergeCells(9, h.col, 10, endCol);
    } else {
      ws.mergeCells(9, h.col, 10, h.col);
    }
    const cell = ws.getCell(9, h.col);
    cell.value = h.label;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = headerFill;
    cell.border = THIN_BORDER;
  }

  applyBorderRange(ws, 9, 10, 3, 32);

  // --- Write test case data ---
  let currentRow = 11;

  const sectionFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };

  for (const section of sections) {
    // Section header row
    const sectionRow = currentRow;
    const storyCell = ws.getCell(sectionRow, 3);
    storyCell.value = section.storyId;
    storyCell.font = { name: FONT_NAME, size: 9 };
    storyCell.alignment = { horizontal: "center", vertical: "middle" };
    storyCell.border = THIN_BORDER;

    ws.mergeCells(sectionRow, 5, sectionRow, 32);
    const sectionTitleCell = ws.getCell(sectionRow, 5);
    sectionTitleCell.value = section.sectionTitle;
    sectionTitleCell.font = {
      name: FONT_NAME,
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    sectionTitleCell.alignment = { vertical: "middle" };
    sectionTitleCell.fill = sectionFill;
    applyBorderRange(ws, sectionRow, sectionRow, 3, 32);

    currentRow++;

    // Test case rows
    let tcIndex = 1;
    for (const tc of section.testCases) {
      const r = currentRow;
      ws.getRow(r).height = 45;

      // Story ID (C column)
      const storyIdCell = ws.getCell(r, 3);
      storyIdCell.value = section.storyId;
      storyIdCell.font = { name: FONT_NAME, size: 9 };
      storyIdCell.alignment = { horizontal: "center", vertical: "middle" };

      // TC No. (D column)
      const tcNoCell = ws.getCell(r, 4);
      tcNoCell.value = `${section.storyId}-${String(tcIndex).padStart(2, "0")}`;
      tcNoCell.font = { name: FONT_NAME, size: 9 };
      tcNoCell.alignment = { horizontal: "center", vertical: "middle" };
      tcIndex++;

      // Depth columns
      const depthCols = [
        { col: 5, val: tc.depth1 },
        { col: 6, val: tc.depth2 },
        { col: 7, val: tc.depth3 },
        { col: 8, val: tc.depth4 },
        { col: 9, val: tc.depth5 },
      ];

      for (const d of depthCols) {
        if (d.val) {
          const cell = ws.getCell(r, d.col);
          cell.value = d.val;
          cell.font = { name: FONT_NAME, size: 9 };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        }
      }

      // Test Type (J=10)
      if (tc.testType) {
        const cell = ws.getCell(r, 10);
        cell.value = tc.testType;
        cell.font = { name: FONT_NAME, size: 9 };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }

      // Precondition (K:M = 11:13)
      ws.mergeCells(r, 11, r, 13);
      if (tc.precondition) {
        const cell = ws.getCell(r, 11);
        cell.value = tc.precondition;
        cell.font = { name: FONT_NAME, size: 9 };
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      }

      // Procedure (N:R = 14:18)
      ws.mergeCells(r, 14, r, 18);
      const procCell = ws.getCell(r, 14);
      procCell.value = tc.procedure;
      procCell.font = { name: FONT_NAME, size: 9 };
      procCell.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };

      // Expected Results (S:U = 19:21)
      ws.mergeCells(r, 19, r, 21);
      const expCell = ws.getCell(r, 19);
      expCell.value = tc.expectedResult;
      expCell.font = { name: FONT_NAME, size: 9 };
      expCell.alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };

      // Actual Results (W:Y = 23:25)
      ws.mergeCells(r, 23, r, 25);

      // Test Status (AA=27)
      const statusCell = ws.getCell(r, 27);
      statusCell.value = "NR";
      statusCell.font = { name: "Arial", size: 10, bold: true };
      statusCell.alignment = { horizontal: "center", vertical: "middle" };

      // Doc Page (AC=29) - Figma 프레임명 출처
      if (tc.docPage) {
        const docPageCell = ws.getCell(r, 29);
        docPageCell.value = tc.docPage;
        docPageCell.font = { name: FONT_NAME, size: 9 };
        docPageCell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }

      // Apply borders to entire row
      applyBorderRange(ws, r, r, 3, 32);

      currentRow++;
    }
  }

  // Freeze panes at row 11
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 10 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
