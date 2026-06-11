import { describe, expect, it, afterEach } from 'vitest';
import { extractTextFromImage, setOcrProvider } from './ocr';
import { parseLabel } from './labelParser';

afterEach(() => setOcrProvider(null));

describe('OCR provider seam', () => {
  it('주입한 provider를 사용하고 결과를 정리한다', async () => {
    setOcrProvider(async () => '원료명:  닭고기,   쌀,\n\n\n자일리톨');
    const text = await extractTextFromImage('data:image/png;base64,xxx', { preprocess: false });
    expect(text).toContain('닭고기');
    // 과도한 공백/빈 줄 정리
    expect(text).not.toContain('   ');
    expect(text).not.toContain('\n\n');
  });

  it('OCR 텍스트가 그대로 parseLabel로 흘러간다 (이미지→텍스트→엔진 연결 확인)', async () => {
    setOcrProvider(async () => '원료명: 닭고기, 쌀, 자일리톨');
    const text = await extractTextFromImage('data:image/png;base64,xxx', { preprocess: false });
    const parsed = parseLabel(text);
    expect(parsed.ingredients[0].ingredient?.id).toBe('chicken');
    expect(parsed.ingredients.some((i) => i.ingredient?.id === 'xylitol')).toBe(true);
  });
});
