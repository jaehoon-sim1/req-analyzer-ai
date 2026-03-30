import { NextRequest } from 'next/server';
import { parsePDF, parseDOCX, parseTXT, parseImage } from '@/lib/parsers';

export const maxDuration = 300; // OCR 처리 시 충분한 시간 확보 (5분)

// In-memory rate limiter: max 5 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.html', '.htm', '.png', '.jpg', '.jpeg'];

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return Response.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: '파일을 업로드해 주세요.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: '파일 크기는 500MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    const filename = file.name;
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: 'PDF, DOCX, TXT, HTML, PNG, JPG 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text: string;

    if (ext === '.pdf') {
      text = await parsePDF(buffer);
    } else if (ext === '.docx') {
      text = await parseDOCX(buffer);
    } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      text = await parseImage(buffer);
    } else if (ext === '.html' || ext === '.htm') {
      // HTML: 태그 제거 후 텍스트만 추출
      const raw = buffer.toString('utf-8');
      text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      text = await parseTXT(buffer);
    }

    return Response.json({ text, filename, fileSize: file.size });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.';
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
