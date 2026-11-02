import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBarcodeDetector } from './barcodeDetector';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['runtime failure', 'partial format support'])('uses the local decoder for native %s', async (scenario) => {
  const bars = '101' + '0001101' + '0100111' + '0101111' + '0111101' + '0001001' + '0110011'
    + '01010' + '1000010' + '1000010' + '1000010' + '1110100' + '1000010' + '1100110' + '101';
  const width = (bars.length + 22) * 3;
  const height = 80;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (bars[Math.floor(x / 3) - 11] === '1') data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
  }
  vi.stubGlobal('BarcodeDetector', class {
    static getSupportedFormats = async () => scenario === 'partial format support'
      ? ['ean_13'] : ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
    async detect() {
      if (scenario === 'partial format support') return [];
      throw new DOMException('Detector service unavailable', 'NotSupportedError');
    }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage() {}, getImageData: () => ({ data, width, height }),
  } as unknown as CanvasRenderingContext2D);
  const video = document.createElement('video');
  Object.defineProperties(video, { videoWidth: { value: width }, videoHeight: { value: height }, readyState: { value: 2 } });
  const detector = await createBarcodeDetector();
  expect(await detector.detect(video)).toEqual([{ rawValue: '4006381333931', format: 'ean_13' }]);
});

describe('native video readiness', () => {
  it('does not send a video without decoded pixels to the native detector', async () => {
    vi.stubGlobal('BarcodeDetector', class { detect = async () => [{ rawValue: '4006381333931', format: 'ean_13' }]; });
    const detector = await createBarcodeDetector();
    expect(await detector.detect(document.createElement('video'))).toEqual([]);
  });
});
