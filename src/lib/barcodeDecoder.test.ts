import { describe, expect, it } from 'vitest';
import { decodeBarcodeImage } from './barcodeDecoder';

describe('local barcode decoding without BarcodeDetector', () => {
  it('decodes a real EAN-13 pixel pattern without network or native APIs', () => {
    // 4006381333931, EAN-13 start / LGLLGG left group / center / right group / end.
    const bars = '101' + '0001101' + '0100111' + '0101111' + '0111101' + '0001001' + '0110011'
      + '01010' + '1000010' + '1000010' + '1000010' + '1110100' + '1000010' + '1100110' + '101';
    const width = (bars.length + 22) * 3;
    const height = 80;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const bit = bars[Math.floor(x / 3) - 11];
      if (bit === '1') pixels.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
    expect(decodeBarcodeImage({ data: pixels, width, height })).toEqual([{ rawValue: '4006381333931' }]);
  }, 15_000);
  it('returns no candidate for a blank frame', () => {
    expect(decodeBarcodeImage({ data: new Uint8ClampedArray(320 * 80 * 4).fill(255), width: 320, height: 80 })).toEqual([]);
  });
});
