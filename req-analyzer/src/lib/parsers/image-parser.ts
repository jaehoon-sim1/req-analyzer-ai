import { getAnthropicClient } from '@/lib/anthropic';

/**
 * Claude Vision API를 사용하여 이미지(PNG/JPG)에서 텍스트를 추출합니다.
 * Tesseract.js 대신 Claude를 사용하여 서버리스 환경에서도 안정적으로 동작합니다.
 * - 모델 다운로드 불필요 (Tesseract.js는 ~4MB 언어 모델 다운로드 필요)
 * - 한국어/영어 모두 지원
 * - Vercel Hobby 플랜(60초 제한)에서도 안정적
 */
export async function parseImage(buffer: Buffer): Promise<string> {
  try {
    const client = getAnthropicClient();
    const base64 = buffer.toString('base64');

    // Detect media type from buffer magic bytes
    const mediaType = detectMediaType(buffer);

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `이 이미지에서 보이는 모든 텍스트를 정확하게 추출해 주세요.
- 화면 기획서, 와이어프레임, 요구사항 문서 등의 이미지일 수 있습니다.
- 레이아웃 구조와 번호 매기기를 최대한 유지해 주세요.
- 표, 메모, 주석 등 모든 텍스트를 빠짐없이 추출해 주세요.
- 추출된 텍스트만 반환하고, 부가 설명은 하지 마세요.`,
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error(
        '이미지에서 텍스트를 추출할 수 없습니다. 텍스트가 포함된 이미지를 업로드해 주세요.'
      );
    }

    return text;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('텍스트를 추출할 수 없습니다')
    ) {
      throw error;
    }
    throw new Error(
      `이미지 텍스트 추출에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    );
  }
}

// Need to import the type for TextBlock filter
import type Anthropic from '@anthropic-ai/sdk';

function detectMediaType(
  buffer: Buffer
): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  // Default to PNG
  return 'image/png';
}
