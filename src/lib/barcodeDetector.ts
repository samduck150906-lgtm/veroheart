export interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
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
      if (!supported || supported.includes('ean_13')) {
        const formats = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'].filter((value) => !supported || supported.includes(value));
        return new NativeDetector({ formats });
      }
    } catch { /* Use the same local decoder on devices with incomplete native support. */ }
  }
  const { createFallbackDecoder } = await import('./barcodeDecoder');
  return createFallbackDecoder();
}
