import ExcelJS from 'exceljs';
import type { AnalysisResult } from '@/types/analysis';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4F46E5' }, // indigo-600
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'left' };
  row.height = 20;
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    if (column) column.width = Math.min(maxLength + 2, 60);
  });
}

export async function exportToExcel(result: AnalysisResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'req-analyzer';
  workbook.created = new Date();

  // --- 메타데이터 시트 ---
  const metaSheet = workbook.addWorksheet('메타데이터');
  metaSheet.columns = [
    { header: '항목', key: 'key', width: 25 },
    { header: '값', key: 'value', width: 40 },
  ];
  styleHeaderRow(metaSheet.getRow(1));
  metaSheet.addRows([
    { key: '분석 일시', value: result.metadata.analyzedAt },
    { key: '입력 길이 (자)', value: result.metadata.inputLength },
    { key: '처리 시간 (ms)', value: result.metadata.processingTimeMs },
    { key: '사용 모델', value: result.metadata.modelUsed },
    {
      key: '실패 섹션',
      value: result.metadata.failedSections?.join(', ') ?? '없음',
    },
  ]);

  // --- 요약 시트 ---
  const summarySheet = workbook.addWorksheet('요약');
  summarySheet.columns = [
    { header: '항목', key: 'key', width: 20 },
    { header: '내용', key: 'value', width: 80 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRow({ key: '개요', value: result.summary.overview });
  result.summary.keyPoints.forEach((point, i) => {
    summarySheet.addRow({ key: `핵심 포인트 ${i + 1}`, value: point });
  });

  // --- 기능 목록 시트 ---
  const featuresSheet = workbook.addWorksheet('기능 목록');
  featuresSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '기능명', key: 'name', width: 30 },
    { header: '설명', key: 'description', width: 60 },
    { header: '카테고리', key: 'category', width: 20 },
  ];
  styleHeaderRow(featuresSheet.getRow(1));
  result.features.features.forEach((f) => {
    featuresSheet.addRow({
      id: f.id,
      name: f.name,
      description: f.description,
      category: f.category ?? '',
    });
  });

  // --- 테스트 포인트 시트 ---
  const testSheet = workbook.addWorksheet('테스트 포인트');
  testSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '설명', key: 'description', width: 70 },
    { header: '카테고리', key: 'category', width: 20 },
    { header: '우선순위', key: 'priority', width: 15 },
  ];
  styleHeaderRow(testSheet.getRow(1));
  result.testPoints.testPoints.forEach((tp) => {
    testSheet.addRow({
      id: tp.id,
      description: tp.description,
      category: tp.category,
      priority: tp.priority,
    });
  });

  // --- 모호한 요구사항 시트 ---
  const ambiguitySheet = workbook.addWorksheet('모호한 요구사항');
  ambiguitySheet.columns = [
    { header: '원문', key: 'original', width: 50 },
    { header: '이슈', key: 'issue', width: 40 },
    { header: '개선 제안', key: 'suggestion', width: 50 },
    { header: '심각도', key: 'severity', width: 15 },
  ];
  styleHeaderRow(ambiguitySheet.getRow(1));
  result.ambiguity.items.forEach((item) => {
    ambiguitySheet.addRow({
      original: item.originalText,
      issue: item.issue,
      suggestion: item.suggestion,
      severity: item.severity,
    });
  });

  // --- 누락 요구사항 시트 ---
  const missingSheet = workbook.addWorksheet('누락 요구사항');
  missingSheet.columns = [
    { header: '카테고리', key: 'category', width: 20 },
    { header: '설명', key: 'description', width: 60 },
    { header: '근거', key: 'reason', width: 50 },
  ];
  styleHeaderRow(missingSheet.getRow(1));
  result.missingRequirements.items.forEach((item) => {
    missingSheet.addRow({
      category: item.category,
      description: item.description,
      reason: item.reason,
    });
  });

  // --- QA 질문 시트 ---
  const qaSheet = workbook.addWorksheet('QA 질문');
  qaSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: '질문', key: 'question', width: 70 },
    { header: '맥락', key: 'context', width: 50 },
    { header: '우선순위', key: 'priority', width: 15 },
  ];
  styleHeaderRow(qaSheet.getRow(1));
  result.qaQuestions.questions.forEach((q) => {
    qaSheet.addRow({
      id: q.id,
      question: q.question,
      context: q.context,
      priority: q.priority,
    });
  });

  // Auto-fit columns for all sheets
  [metaSheet, summarySheet, featuresSheet, testSheet, ambiguitySheet, missingSheet, qaSheet].forEach(
    autoFitColumns
  );

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
