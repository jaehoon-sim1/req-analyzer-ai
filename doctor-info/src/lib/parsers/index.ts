import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer);
    case 'docx':
      return parseDOCX(buffer);
    case 'txt':
    case 'md':
      return buffer.toString('utf-8');
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
  }
}

async function parsePDF(buffer: Buffer): Promise<string> {
  const pdf = (pdfParse as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default || pdfParse;
  const data = await (pdf as (buf: Buffer) => Promise<{ text: string }>)(buffer);
  return data.text;
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
