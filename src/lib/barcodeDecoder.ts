import { BarcodeFormat, BinaryBitmap, BitArray, DecodeHintType, EAN13Reader, HybridBinarizer, MultiFormatOneDReader, RGBLuminanceSource, NotFoundException, ChecksumException, FormatException, Result, ResultPoint } from '@zxing/library';
import { normalizeScannedBarcode } from './scanBarcode';

const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128]],
  [DecodeHintType.TRY_HARDER, true],
]);
const UPC_E_PARITIES = [
  [0x38, 0x34, 0x32, 0x31, 0x2c, 0x26, 0x23, 0x2a, 0x29, 0x25],
  [0x07, 0x0b, 0x0d, 0x0e, 0x13, 0x19, 0x1c, 0x15, 0x16, 0x1a],
];

class RetailBarcodeReader extends MultiFormatOneDReader {
  override decodeRow(rowNumber: number, row: BitArray, rowHints: Map<DecodeHintType, unknown>): Result {
    try {
      return super.decodeRow(rowNumber, row, rowHints);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }
    // @zxing/library's experimental UPC-E reader has an incompatible
    // decodeMiddle return shape. Reuse its stable EAN run-length primitives
    // with UPC-E parity, end guard and expanded checksum rules.
    const start = EAN13Reader.findStartGuardPattern(row);
    const counters = new Int32Array(4);
    let offset = start[1];
    let payload = '';
    let parity = 0;
    for (let index = 0; index < 6; index++) {
      const digit = EAN13Reader.decodeDigit(row, counters, offset, EAN13Reader.L_AND_G_PATTERNS);
      payload += String(digit % 10);
      offset += counters.reduce((sum, count) => sum + count, 0);
      if (digit >= 10) parity |= 1 << (5 - index);
    }
    const system = UPC_E_PARITIES.findIndex((patterns) => patterns.includes(parity));
    if (system < 0) throw new NotFoundException();
    const rawValue = `${system}${payload}${UPC_E_PARITIES[system].indexOf(parity)}`;
    if (!normalizeScannedBarcode({ rawValue, format: 'upc_e' })) throw new ChecksumException();
    const end = EAN13Reader.findGuardPattern(row, offset, true, new Int32Array([1, 1, 1, 1, 1, 1]), new Int32Array(6));
    const quietEnd = end[1] + end[1] - end[0];
    if (quietEnd >= row.getSize() || !row.isRange(end[1], quietEnd, false)) throw new NotFoundException();
    return new Result(rawValue, null, 0, [new ResultPoint(start[0], rowNumber), new ResultPoint(end[1], rowNumber)], BarcodeFormat.UPC_E);
  }
}

const reader = new RetailBarcodeReader(hints);

function decodeLuminance(luminance: Uint8ClampedArray, width: number, height: number) {
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, width, height)));
    const result = reader.decode(bitmap, hints);
    return [{ rawValue: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()].toLowerCase() }];
  } catch (error) {
    if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return [];
    throw error;
  } finally { reader.reset(); }
}

/** The decoder is bundled locally; frames never leave the device. */
export function decodeBarcodeImage(frame: { data: Uint8ClampedArray; width: number; height: number }): { rawValue: string; format: string }[] {
  const luminance = new Uint8ClampedArray(frame.width * frame.height);
  for (let i = 0; i < luminance.length; i++) {
    const offset = i * 4;
    luminance[i] = (frame.data[offset] + 2 * frame.data[offset + 1] + frame.data[offset + 2]) / 4;
  }
  const result = decodeLuminance(luminance, frame.width, frame.height);
  if (result.length) return result;
  // RGBLuminanceSource does not support ZXing's built-in rotation. Try the
  // perpendicular orientation too so portrait/landscape capture works alike.
  const rotated = new Uint8ClampedArray(luminance.length);
  for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
    rotated[x * frame.height + frame.height - 1 - y] = luminance[y * frame.width + x];
  }
  return decodeLuminance(rotated, frame.height, frame.width);
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
