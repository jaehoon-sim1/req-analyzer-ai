import pdfParse from 'pdf-parse';

export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(
      `PDF 파일 파싱에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    );
  }
}
