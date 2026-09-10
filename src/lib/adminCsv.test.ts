import { describe, expect, it } from 'vitest';
import { csvCell, waitlistRowsToCsv } from './adminCsv';

describe('admin CSV', () => {
  it('CSV formula injection과 따옴표를 무해화한다', () => {
    expect(csvCell('=HYPERLINK("https://bad.example")')).toBe('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csvCell('+1234')).toBe('"\'+1234"');
    expect(csvCell('safe@example.com')).toBe('"safe@example.com"');
  });

  it('대기자 행을 일관된 CSV로 변환한다', () => {
    const csv = waitlistRowsToCsv([{
      id: '1',
      email: 'hello@example.com',
      phone: null,
      source: 'landing',
      marketingConsent: true,
      privacyConsent: true,
      createdAt: '2026-09-10T00:00:00Z',
    }]);
    expect(csv).toContain('"hello@example.com"');
    expect(csv).toContain('"landing"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
