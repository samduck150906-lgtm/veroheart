import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicOrigin, publicUrl } from './publicUrls';

afterEach(() => vi.unstubAllEnvs());
describe('public URLs', () => {
  it('never shares the local WebView origin', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', '');
    expect(publicUrl('/product/food-1')).toBe('https://veroro-app.netlify.app/product/food-1');
  });
  it('uses a configured HTTPS origin and strips any deployment path', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://app.example.com/deploy/');
    expect(publicUrl('/event/personality-quiz?result=SA')).toBe('https://app.example.com/event/personality-quiz?result=SA');
  });
  it.each(['http://localhost:5173', 'capacitor://localhost', 'https://localhost', 'https://user:pass@app.example.com', 'javascript:alert(1)'])('rejects unsafe canonical origin %s', (origin) => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', origin);
    expect(getPublicOrigin()).toBe('https://veroro-app.netlify.app');
  });
  it('does not allow absolute or protocol-relative share destinations', () => {
    expect(() => publicUrl('//evil.example/path')).toThrow();
    expect(() => publicUrl('https://evil.example')).toThrow();
  });
});
