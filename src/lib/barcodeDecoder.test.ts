import { describe, expect, it } from 'vitest';
import { decodeBarcodeImage } from './barcodeDecoder';

describe('local barcode decoding without BarcodeDetector', () => {
  it.each([
    {
      rawValue: '036000291452', format: 'upc_a',
      bars: '101' + '0001101' + '0111101' + '0101111' + '0001101' + '0001101' + '0001101'
        + '01010' + '1101100' + '1110100' + '1100110' + '1011100' + '1001110' + '1101100' + '101',
    },
    {
      rawValue: '96385074', format: 'ean_8',
      bars: '101' + '0001011' + '0101111' + '0111101' + '0110111'
        + '01010' + '1001110' + '1110010' + '1000100' + '1011100' + '101',
    },
  ])('preserves $format while decoding real pixels', ({ rawValue, format, bars }) => {
    const width = (bars.length + 22) * 3;
    const height = 80;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (bars[Math.floor(x / 3) - 11] === '1') data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
    expect(decodeBarcodeImage({ data, width, height })).toEqual([{ rawValue, format }]);
  });

  it('rejects a UPC-E pattern with mismatched checksum parity', () => {
    // Same 425261 payload, but check-digit-5 G/L/L/G/G/L parity, not valid 4.
    const bars = '101' + '0011101' + '0010011' + '0110001' + '0011011' + '0000101' + '0011001' + '010101';
    const width = (bars.length + 22) * 3;
    const height = 80;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (bars[Math.floor(x / 3) - 11] === '1') data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
    expect(decodeBarcodeImage({ data, width, height })).toEqual([]);
  });
  it.each([
    // Payload 425261 with each number system's checksum parity.
    { rawValue: '04252614', bars: '101' + '0011101' + '0010011' + '0111001' + '0011011' + '0101111' + '0011001' + '010101' },
    { rawValue: '14252611', bars: '101' + '0100011' + '0010011' + '0111001' + '0010011' + '0000101' + '0110011' + '010101' },
  ])('decodes the real UPC-E pattern $rawValue instead of treating it as EAN-8', ({ rawValue, bars }) => {
    const width = (bars.length + 22) * 3;
    const height = 80;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (bars[Math.floor(x / 3) - 11] === '1') data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
    expect(decodeBarcodeImage({ data, width, height })).toEqual([{ rawValue, format: 'upc_e' }]);
  });
  it('decodes a sideways EAN-13 camera frame', () => {
    const bars = '101' + '0001101' + '0100111' + '0101111' + '0111101' + '0001001' + '0110011'
      + '01010' + '1000010' + '1000010' + '1000010' + '1110100' + '1000010' + '1100110' + '101';
    const width = 80;
    const height = (bars.length + 22) * 3;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (bars[Math.floor(y / 3) - 11] === '1') pixels.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
    expect(decodeBarcodeImage({ data: pixels, width, height })).toEqual([{ rawValue: '4006381333931', format: 'ean_13' }]);
  });
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
    expect(decodeBarcodeImage({ data: pixels, width, height })).toEqual([{ rawValue: '4006381333931', format: 'ean_13' }]);
  }, 15_000);
  it('returns no candidate for a blank frame', () => {
    expect(decodeBarcodeImage({ data: new Uint8ClampedArray(320 * 80 * 4).fill(255), width: 320, height: 80 })).toEqual([]);
  });
});
