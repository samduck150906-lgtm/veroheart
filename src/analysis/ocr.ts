/**
 * OCR — 성분표 사진에서 텍스트 추출 (tesseract.js).
 * tesseract.js는 무겁고 언어 데이터를 런타임에 받으므로, 호출 시점에 동적 import 한다
 * (메인 번들에 포함되지 않음).
 */
export interface OcrProgress {
  label: string;
  /** 0~1 */
  ratio: number;
}

const STATUS_LABEL: Record<string, string> = {
  'loading tesseract core': '인식 엔진 준비 중',
  'initializing tesseract': '인식 엔진 초기화 중',
  'loading language traineddata': '한글 데이터 받는 중',
  'initializing api': '준비 중',
  'recognizing text': '글자 인식 중',
};

export async function extractTextFromImage(
  image: string,
  opts: { langs?: string; onProgress?: (p: OcrProgress) => void } = {},
): Promise<string> {
  const { langs = 'kor+eng', onProgress } = opts;
  const Tesseract = (await import('tesseract.js')).default;
  const { data } = await Tesseract.recognize(image, langs, {
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress({ label: STATUS_LABEL[m.status ?? ''] ?? '인식 중', ratio: m.progress });
      }
    },
  });
  return (data?.text ?? '').trim();
}
