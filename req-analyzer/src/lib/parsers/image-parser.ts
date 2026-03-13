import Tesseract from 'tesseract.js';

/**
 * OCR을 사용하여 이미지(PNG/JPG)에서 텍스트를 추출합니다.
 * tesseract.js를 사용하며, 한국어 + 영어를 기본 지원합니다.
 */
export async function parseImage(buffer: Buffer): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(buffer, 'kor+eng', {
      logger: () => {}, // suppress progress logs on server
    });

    const text = data.text?.trim();
    if (!text) {
      throw new Error('이미지에서 텍스트를 추출할 수 없습니다. 텍스트가 포함된 이미지를 업로드해 주세요.');
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes('텍스트를 추출할 수 없습니다')) {
      throw error;
    }
    throw new Error(
      `이미지 OCR 처리에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    );
  }
}
