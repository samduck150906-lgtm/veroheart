import type { AdminWaitlistRow } from './adminApi';

/** Excel에서 수식으로 실행될 수 있는 셀은 문자열로 강제한다. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function waitlistRowsToCsv(rows: AdminWaitlistRow[]): string {
  const header = ['이메일', '전화번호', '유입 경로', '마케팅 동의', '개인정보 동의', '등록일'];
  const body = rows.map((row) => [
    row.email,
    row.phone,
    row.source,
    row.marketingConsent ? '동의' : '미동의',
    row.privacyConsent ? '동의' : '미동의',
    row.createdAt,
  ]);
  return [header, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n');
}
