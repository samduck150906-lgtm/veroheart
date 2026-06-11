/**
 * 이미지 → 텍스트(OCR) 추출 — 분석 파이프라인의 이미지 입력 어댑터.
 *
 *   [이미지] → (여기) OCR → 라벨 텍스트 → parseLabel → 규칙 엔진
 *
 * 설계 원칙: OCR/비전은 "글자를 옮겨적기"만 한다. 위험/안전 판단은 하지 않는다.
 * 기본 구현은 tesseract.js(온디바이스, 가입·비용 없음)이며, 정확도가 더 필요하면
 * setOcrProvider로 클라우드 OCR/비전 LLM 전사기로 교체할 수 있다.
 */

/** dataURL(또는 URL) 이미지를 받아 추출된 텍스트를 돌려주는 전사기 */
export type OcrProvider = (image: string) => Promise<string>;

let customProvider: OcrProvider | null = null;

/** OCR 엔진을 교체한다(클라우드 OCR/비전 LLM 등). null이면 tesseract 기본값. */
export function setOcrProvider(provider: OcrProvider | null): void {
  customProvider = provider;
}

export interface ExtractOptions {
  /** 인식 언어 (tesseract). 기본 한글+영문 */
  langs?: string;
  /** 그레이스케일·대비 전처리 사용 여부 */
  preprocess?: boolean;
  /** 진행률 콜백 (0~1) */
  onProgress?: (ratio: number) => void;
}

/** 브라우저 환경 여부 (canvas 사용 가능) */
function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof Image !== 'undefined';
}

/**
 * OCR 정확도를 높이기 위한 가벼운 전처리:
 * 그레이스케일 → 대비 강화. 캔버스가 없으면 원본을 그대로 반환.
 */
export async function preprocessImage(dataUrl: string): Promise<string> {
  if (!isBrowser()) return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  // 너무 작으면 인식률이 떨어지므로 가로 최소 1000px로 업스케일
  const minWidth = 1000;
  const scale = img.width < minWidth ? minWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // 그레이스케일 + 대비 (contrast factor)
  const contrast = 1.35;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, contrast * gray + intercept));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** tesseract.js 기본 전사기 (코드 스플릿을 위해 동적 import) */
async function tesseractRecognize(
  image: string,
  langs: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(langs, undefined, {
    logger: onProgress
      ? (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') onProgress(m.progress);
        }
      : undefined,
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text ?? '';
  } finally {
    await worker.terminate();
  }
}

/**
 * 이미지에서 텍스트를 추출한다.
 * provider가 설정돼 있으면 그것을, 아니면 tesseract.js를 사용한다.
 */
export async function extractTextFromImage(
  image: string,
  opts: ExtractOptions = {},
): Promise<string> {
  const { langs = 'kor+eng', preprocess = true, onProgress } = opts;
  const prepared = preprocess ? await preprocessImage(image) : image;

  const raw = customProvider
    ? await customProvider(prepared)
    : await tesseractRecognize(prepared, langs, onProgress);

  // 라벨 파서가 잘 먹도록 가벼운 정리: 과도한 공백/빈 줄 정돈
  return raw
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
