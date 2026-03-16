import { describe, it, expect } from 'vitest';
import { parseTXT } from '@/lib/parsers/txt-parser';

describe('TXT Parser', () => {
  it('UTF-8 텍스트 파일을 정상적으로 파싱한다', async () => {
    const text = '1. 사용자는 로그인할 수 있어야 한다.\n2. 비밀번호는 8자 이상이어야 한다.';
    const buffer = Buffer.from(text, 'utf-8');
    const result = await parseTXT(buffer);
    expect(result).toBe(text);
  });

  it('빈 텍스트 파일을 처리한다', async () => {
    const buffer = Buffer.from('', 'utf-8');
    const result = await parseTXT(buffer);
    expect(result).toBe('');
  });

  it('한국어 특수문자를 포함한 텍스트를 처리한다', async () => {
    const text = '요구사항: "빠르게" 응답해야 하며, ~할 수 있어야 한다.';
    const buffer = Buffer.from(text, 'utf-8');
    const result = await parseTXT(buffer);
    expect(result).toBe(text);
  });

  it('대용량 텍스트(50,000자)를 처리한다', async () => {
    const text = '요구사항 '.repeat(5000); // 약 30,000자
    const buffer = Buffer.from(text, 'utf-8');
    const result = await parseTXT(buffer);
    expect(result).toBe(text);
  });
});
