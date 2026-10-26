import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource, NotFoundException, ChecksumException, FormatException } from '@zxing/library';

const reader = new MultiFormatReader();
reader.setHints(new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]],
  [DecodeHintType.TRY_HARDER, true],
]));

/** The decoder is bundled locally; frames never leave the device. */
export function decodeBarcodeImage(frame: { data: Uint8ClampedArray; width: number; height: number }): { rawValue: string }[] {
  const luminance = new Uint8ClampedArray(frame.width * frame.height);
  for (let i = 0; i < luminance.length; i++) {
    const offset = i * 4;
    luminance[i] = (frame.data[offset] + 2 * frame.data[offset + 1] + frame.data[offset + 2]) / 4;
  }
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, frame.width, frame.height)));
    return [{ rawValue: reader.decodeWithState(bitmap).getText() }];
  } catch (error) {
    if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return [];
    throw error;
  } finally { reader.reset(); }
}

export function createFallbackDecoder() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas decoding is unavailable');
  return {
    async detect(video: HTMLVideoElement) {
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return [];
      const scale = Math.min(1, 960 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return decodeBarcodeImage(context.getImageData(0, 0, canvas.width, canvas.height));
    },
  };
}
