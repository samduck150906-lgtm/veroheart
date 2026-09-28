const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MIN_LONG_EDGE = 900;
const MAX_LONG_EDGE = 2200;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type ImagePreparationErrorCode =
  | 'unsupported_image_type'
  | 'image_too_small'
  | 'image_too_large'
  | 'image_decode_failed'
  | 'image_export_failed';

export class ImagePreparationError extends Error {
  readonly code: ImagePreparationErrorCode;

  constructor(code: ImagePreparationErrorCode) {
    super(code);
    this.name = 'ImagePreparationError';
    this.code = code;
  }
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encodeWithinLimit(canvas: HTMLCanvasElement): Promise<Blob> {
  const initialWebp = await canvasBlob(canvas, 'image/webp', 0.86);
  if (!initialWebp) {
    const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.86);
    if (!jpeg) throw new ImagePreparationError('image_export_failed');
    if (jpeg.size <= MAX_OUTPUT_BYTES) return jpeg;
    for (const quality of [0.72, 0.58]) {
      const compressed = await canvasBlob(canvas, 'image/jpeg', quality);
      if (compressed && compressed.size <= MAX_OUTPUT_BYTES) return compressed;
    }
    throw new ImagePreparationError('image_too_large');
  }
  if (initialWebp.size <= MAX_OUTPUT_BYTES) return initialWebp;

  for (const quality of [0.72, 0.58]) {
    const compressed = await canvasBlob(canvas, 'image/webp', quality);
    if (compressed && compressed.size <= MAX_OUTPUT_BYTES) return compressed;
  }
  for (const quality of [0.82, 0.68]) {
    const compressed = await canvasBlob(canvas, 'image/jpeg', quality);
    if (compressed && compressed.size <= MAX_OUTPUT_BYTES) return compressed;
  }
  throw new ImagePreparationError('image_too_large');
}

export async function prepareLabelImage(source: Blob): Promise<Blob> {
  if (!SUPPORTED_IMAGE_TYPES.has(source.type)) {
    throw new ImagePreparationError('unsupported_image_type');
  }
  if (source.size > MAX_SOURCE_BYTES) throw new ImagePreparationError('image_too_large');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    throw new ImagePreparationError('image_decode_failed');
  }

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge < MIN_LONG_EDGE) throw new ImagePreparationError('image_too_small');
    const scale = Math.min(1, MAX_LONG_EDGE / longEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new ImagePreparationError('image_export_failed');

    context.drawImage(bitmap, 0, 0, width, height);
    return await encodeWithinLimit(canvas);
  } finally {
    bitmap.close();
  }
}
