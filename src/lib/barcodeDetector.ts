import type { ScannedBarcode } from './scanBarcode';

export interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<ScannedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

export async function createBarcodeDetector(): Promise<BarcodeDetectorLike> {
  const NativeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (NativeDetector) {
    try {
      const supported = await NativeDetector.getSupportedFormats?.();
      const formats = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'];
      if (!supported || formats.every((value) => supported.includes(value))) {
        const native = new NativeDetector({ formats });
        let fallback: BarcodeDetectorLike | null = null;
        return {
          async detect(source) {
            if (source.readyState < 2 || !source.videoWidth || !source.videoHeight) return [];
            if (fallback) return fallback.detect(source);
            try {
              return await native.detect(source);
            } catch {
              // Some Android/WebView implementations expose BarcodeDetector but
              // fail only when detect() starts. Recover without a frozen preview.
              const { createFallbackDecoder } = await import('./barcodeDecoder');
              fallback = createFallbackDecoder();
              return fallback.detect(source);
            }
          },
        };
      }
    } catch { /* Use the same local decoder on devices with incomplete native support. */ }
  }
  const { createFallbackDecoder } = await import('./barcodeDecoder');
  return createFallbackDecoder();
}
