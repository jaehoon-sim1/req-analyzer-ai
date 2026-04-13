import ExcelJS from 'exceljs';

/**
 * Excel 파일(.xlsx)에서 시트별 텍스트를 추출합니다.
 * 각 시트를 [시트명] 구분자로 분리하고, 행/셀 데이터를 텍스트로 변환합니다.
 */
export async function parseXLSX(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheets: string[] = [];

  workbook.eachSheet((worksheet) => {
    const rows: string[] = [];

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const value = getCellText(cell);
        if (value.trim()) {
          cells.push(value.trim());
        }
      });
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    });

    if (rows.length > 0) {
      sheets.push(`[${worksheet.name}]\n${rows.join('\n')}`);
    }
  });

  if (sheets.length === 0) {
    return 'Excel 파일에서 텍스트를 추출할 수 없습니다.';
  }

  return sheets.join('\n\n');
}

function getCellText(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return '';

  // Rich text
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return cell.value.richText.map((rt) => rt.text).join('');
  }

  // Formula result
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result ?? '');
  }

  // Date
  if (cell.value instanceof Date) {
    return cell.value.toLocaleDateString('ko-KR');
  }

  return String(cell.value);
}
