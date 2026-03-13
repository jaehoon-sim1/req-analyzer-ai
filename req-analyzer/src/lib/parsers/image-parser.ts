import Tesseract from 'tesseract.js';

/**
 * OCR을 사용하여 이미지(PNG/JPG)에서 텍스트를 추출합니다.
 * tesseract.js를 사용하며, 영어를 기본 지원합니다.
 * (한국어 모델은 ~15MB로 서버리스 환경에서 타임아웃 위험이 있어 영어 우선)
 */
export async function parseImage(buffer: Buffer): Promise<string> {
  try {
    // eng 모델은 ~4MB로 서버리스 환경에서도 안정적
    // 한국어 포함 시 'kor+eng'로 변경 가능 (로컬 환경 권장)
    const lang = process.env.OCR_LANGUAGE || 'eng';

    const { data } = await Tesseract.recognize(buffer, lang, {
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
