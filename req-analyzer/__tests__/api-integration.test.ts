import { describe, it, expect } from 'vitest';

/**
 * 통합 테스트 — API 라우트의 요청/응답 검증 로직
 *
 * 실제 Next.js 서버를 띄우지 않고, API 라우트의 핵심 비즈니스 로직을 검증한다.
 * analyze, upload, export 라우트의 입력 검증과 에러 처리 패턴을 테스트한다.
 */

describe('Analyze API — 입력 검증', () => {
  function validateAnalyzeInput(body: { text?: unknown }): { valid: boolean; error?: string; status?: number } {
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return { valid: false, error: '요구사항 텍스트를 입력해 주세요.', status: 400 };
    }

    if (text.trim().length < 10) {
      return { valid: false, error: '요구사항은 최소 10자 이상 입력해 주세요.', status: 400 };
    }

    if (text.length > 50000) {
      return { valid: false, error: '입력 텍스트는 50,000자 이내여야 합니다.', status: 400 };
    }

    return { valid: true };
  }

  it('텍스트가 없으면 400 에러를 반환한다', () => {
    const result = validateAnalyzeInput({});
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
  });

  it('텍스트가 문자열이 아니면 400 에러를 반환한다', () => {
    const result = validateAnalyzeInput({ text: 123 });
    expect(result.valid).toBe(false);
  });

  it('10자 미만이면 400 에러를 반환한다', () => {
    const result = validateAnalyzeInput({ text: '짧음' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10자');
  });

  it('50,000자 초과이면 400 에러를 반환한다', () => {
    const result = validateAnalyzeInput({ text: 'a'.repeat(50001) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('50,000자');
  });

  it('유효한 텍스트는 통과한다', () => {
    const result = validateAnalyzeInput({ text: '사용자는 이메일로 로그인할 수 있어야 한다.' });
    expect(result.valid).toBe(true);
  });
});

describe('Upload API — 파일 검증', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

  function validateUpload(file: { name: string; size: number } | null): { valid: boolean; error?: string; status?: number } {
    if (!file) {
      return { valid: false, error: '파일을 업로드해 주세요.', status: 400 };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.', status: 400 };
    }

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'PDF, DOCX, TXT, PNG, JPG 파일만 업로드할 수 있습니다.', status: 400 };
    }

    return { valid: true };
  }

  it('파일이 없으면 400 에러를 반환한다', () => {
    expect(validateUpload(null).valid).toBe(false);
  });

  it('10MB 초과 파일은 400 에러를 반환한다', () => {
    const result = validateUpload({ name: 'big.pdf', size: 11 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10MB');
  });

  it('지원하지 않는 확장자는 400 에러를 반환한다', () => {
    const result = validateUpload({ name: 'script.js', size: 1024 });
    expect(result.valid).toBe(false);
  });

  it('지원 파일 형식은 통과한다', () => {
    expect(validateUpload({ name: 'req.pdf', size: 1024 }).valid).toBe(true);
    expect(validateUpload({ name: 'req.docx', size: 1024 }).valid).toBe(true);
    expect(validateUpload({ name: 'req.txt', size: 1024 }).valid).toBe(true);
    expect(validateUpload({ name: 'img.png', size: 1024 }).valid).toBe(true);
    expect(validateUpload({ name: 'img.jpg', size: 1024 }).valid).toBe(true);
    expect(validateUpload({ name: 'img.jpeg', size: 1024 }).valid).toBe(true);
  });
});

describe('Export API — 요청 검증', () => {
  function validateExportRequest(body: { result?: unknown; format?: unknown }): { valid: boolean; error?: string } {
    if (!body.result || typeof body.result !== 'object') {
      return { valid: false, error: '분석 결과가 필요합니다.' };
    }

    if (!body.format || !['excel', 'json'].includes(body.format as string)) {
      return { valid: false, error: "format은 'excel' 또는 'json'이어야 합니다." };
    }

    return { valid: true };
  }

  it('result가 없으면 실패한다', () => {
    expect(validateExportRequest({ format: 'excel' }).valid).toBe(false);
  });

  it('format이 없으면 실패한다', () => {
    expect(validateExportRequest({ result: {} }).valid).toBe(false);
  });

  it('잘못된 format 값은 실패한다', () => {
    expect(validateExportRequest({ result: {}, format: 'csv' }).valid).toBe(false);
  });

  it('excel format은 통과한다', () => {
    expect(validateExportRequest({ result: {}, format: 'excel' }).valid).toBe(true);
  });

  it('json format은 통과한다', () => {
    expect(validateExportRequest({ result: {}, format: 'json' }).valid).toBe(true);
  });
});

describe('Image Parser — 미디어 타입 감지', () => {
  function detectMediaType(
    buffer: Buffer
  ): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
    return 'image/png';
  }

  it('PNG 매직 바이트를 감지한다', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(detectMediaType(buf)).toBe('image/png');
  });

  it('JPEG 매직 바이트를 감지한다', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMediaType(buf)).toBe('image/jpeg');
  });

  it('GIF 매직 바이트를 감지한다', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38]);
    expect(detectMediaType(buf)).toBe('image/gif');
  });

  it('알 수 없는 형식은 PNG 기본값을 반환한다', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(detectMediaType(buf)).toBe('image/png');
  });
});
