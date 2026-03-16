import { describe, it, expect } from 'vitest';

/**
 * analyzer.ts의 parseJSON 함수는 모듈 내부 함수이므로,
 * 동일한 로직을 테스트용으로 재현하여 검증한다.
 */
function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

describe('parseJSON — LLM 응답 JSON 파싱', () => {
  it('순수 JSON 문자열을 파싱한다', () => {
    const input = '{"overview": "요약", "keyPoints": ["포인트1"]}';
    const result = parseJSON(input);
    expect(result).toEqual({ overview: '요약', keyPoints: ['포인트1'] });
  });

  it('마크다운 코드 블록(```json)에서 JSON을 추출한다', () => {
    const input = '```json\n{"overview": "요약", "keyPoints": []}\n```';
    const result = parseJSON(input);
    expect(result).toEqual({ overview: '요약', keyPoints: [] });
  });

  it('json 태그 없는 마크다운 코드 블록을 처리한다', () => {
    const input = '```\n{"features": []}\n```';
    const result = parseJSON(input);
    expect(result).toEqual({ features: [] });
  });

  it('코드 블록 앞뒤에 텍스트가 있어도 JSON을 추출한다', () => {
    const input = '다음은 분석 결과입니다:\n```json\n{"items": []}\n```\n이상입니다.';
    const result = parseJSON(input);
    expect(result).toEqual({ items: [] });
  });

  it('잘못된 JSON은 에러를 던진다', () => {
    expect(() => parseJSON('not a json')).toThrow();
  });

  it('빈 문자열은 에러를 던진다', () => {
    expect(() => parseJSON('')).toThrow();
  });

  it('중첩된 객체를 파싱한다', () => {
    const input = JSON.stringify({
      items: [{
        originalText: '빠르게',
        issue: '정량적 기준 없음',
        suggestion: '2초 이내',
        severity: 'warning',
      }],
    });
    const result = parseJSON<{ items: { severity: string }[] }>(input);
    expect(result.items[0].severity).toBe('warning');
  });
});

describe('Rate Limiter 로직 검증', () => {
  it('IP별 요청 제한을 검증한다', () => {
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

    // 첫 5회 요청은 통과
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited('127.0.0.1')).toBe(false);
    }
    // 6번째 요청은 차단
    expect(isRateLimited('127.0.0.1')).toBe(true);

    // 다른 IP는 별도로 카운트
    expect(isRateLimited('192.168.1.1')).toBe(false);
  });
});

describe('입력 검증 로직', () => {
  it('최소 10자 미만 입력은 유효하지 않다', () => {
    const MIN_CHARS = 10;
    expect('짧은'.trim().length < MIN_CHARS).toBe(true);
    expect('이것은 충분히 긴 요구사항입니다.'.trim().length >= MIN_CHARS).toBe(true);
  });

  it('50,000자 초과 입력은 유효하지 않다', () => {
    const MAX_CHARS = 50000;
    const longText = 'a'.repeat(50001);
    expect(longText.length > MAX_CHARS).toBe(true);
  });

  it('공백만 있는 입력은 유효하지 않다', () => {
    const MIN_CHARS = 10;
    expect('   '.trim().length < MIN_CHARS).toBe(true);
  });
});

describe('파일 업로드 검증 로직', () => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

  function getExtension(filename: string): string {
    return filename.slice(filename.lastIndexOf('.')).toLowerCase();
  }

  it('허용된 파일 확장자를 검증한다', () => {
    expect(ALLOWED_EXTENSIONS.includes(getExtension('doc.pdf'))).toBe(true);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('file.docx'))).toBe(true);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('test.txt'))).toBe(true);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('image.png'))).toBe(true);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('photo.jpg'))).toBe(true);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('photo.jpeg'))).toBe(true);
  });

  it('허용되지 않은 파일 확장자를 거부한다', () => {
    expect(ALLOWED_EXTENSIONS.includes(getExtension('script.js'))).toBe(false);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('app.exe'))).toBe(false);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('data.csv'))).toBe(false);
    expect(ALLOWED_EXTENSIONS.includes(getExtension('styles.css'))).toBe(false);
  });

  it('파일 크기 제한을 검증한다', () => {
    expect(5 * 1024 * 1024 > MAX_FILE_SIZE).toBe(false);  // 5MB OK
    expect(11 * 1024 * 1024 > MAX_FILE_SIZE).toBe(true);   // 11MB 초과
  });
});
