import { afterEach, describe, expect, it, vi } from 'vitest';

import { prepareLabelImage } from './imagePrepare';

interface CanvasScenario {
  width: number;
  height: number;
  outputs: Array<Blob | null>;
}

function installImageMocks(scenario: CanvasScenario) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    width: scenario.width,
    height: scenario.height,
    close,
  }));
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage })),
    toBlob: vi.fn((callback: BlobCallback) => callback(scenario.outputs.shift() ?? null)),
  };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);
  return { canvas, drawImage, close };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prepareLabelImage', () => {
  it('rejects unsupported source MIME types before decoding', async () => {
    await expect(prepareLabelImage(new Blob(['x'], { type: 'application/pdf' })))
      .rejects.toMatchObject({ code: 'unsupported_image_type' });
  });

  it('rejects an image below 900px on its longest decoded edge', async () => {
    installImageMocks({ width: 899, height: 600, outputs: [] });

    await expect(prepareLabelImage(new Blob(['pixels'], { type: 'image/jpeg' })))
      .rejects.toMatchObject({ code: 'image_too_small' });
  });

  it('redraws pixels to a new canvas, bounds the longest edge, and exports WebP', async () => {
    const output = new Blob(['fresh-pixels'], { type: 'image/webp' });
    const { canvas, drawImage, close } = installImageMocks({
      width: 4400,
      height: 3300,
      outputs: [output],
    });
    const source = new Blob(['source-with-exif'], { type: 'image/jpeg' });

    const result = await prepareLabelImage(source);

    expect(canvas.width).toBe(2200);
    expect(canvas.height).toBe(1650);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(result).toBe(output);
    expect(result).not.toBe(source);
    expect(result.type).toBe('image/webp');
    expect(close).toHaveBeenCalledOnce();
  });

  it('falls back to JPEG when WebP export is unavailable', async () => {
    const jpeg = new Blob(['jpeg-pixels'], { type: 'image/jpeg' });
    installImageMocks({ width: 1200, height: 900, outputs: [null, jpeg] });

    const result = await prepareLabelImage(new Blob(['source'], { type: 'image/png' }));

    expect(result.type).toBe('image/jpeg');
  });

  it('returns image_too_large when bounded re-encoding cannot reach 4 MB', async () => {
    const oversized = new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: 'image/webp' });
    installImageMocks({
      width: 2200,
      height: 1600,
      outputs: [oversized, oversized, oversized, oversized, oversized],
    });

    await expect(prepareLabelImage(new Blob(['source'], { type: 'image/jpeg' })))
      .rejects.toMatchObject({ code: 'image_too_large' });
  });
});
