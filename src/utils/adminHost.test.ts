import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import adminDomainBoundary from '../../netlify/edge-functions/admin-domain-boundary';
import {
  isAdminExperience,
  isAdminHostname,
  isAdminRoute,
  isBlockedAdminRoute,
} from './adminHost';

describe('adminHost', () => {
  it('관리자 운영 도메인을 식별한다', () => {
    expect(isAdminHostname('veroro-admin.netlify.app')).toBe(true);
    expect(isAdminExperience('veroro-admin.netlify.app', '/admin/products')).toBe(true);
  });

  it('공개 앱 도메인의 관리자 경로를 차단한다', () => {
    expect(isAdminRoute('/admin/ingredients')).toBe(true);
    expect(isBlockedAdminRoute('veroro-app.netlify.app', '/admin/ingredients')).toBe(true);
    expect(isAdminExperience('veroro-app.netlify.app', '/admin/ingredients')).toBe(false);
  });

  it('localhost에서는 관리자 개발 경로를 유지한다', () => {
    expect(isAdminExperience('localhost', '/admin')).toBe(true);
  });

  it('Netlify 경계는 지원되지 않는 Host 조건이 아니라 도메인 수준 경로를 쓴다', () => {
    const config = readFileSync(resolve(process.cwd(), 'netlify.toml'), 'utf8');
    expect(config).toContain('from = "https://veroro-app.netlify.app/admin/*"');
    expect(config).not.toContain('conditions = {Host');
  });

  it('관리자 도메인 루트는 Edge에서 /admin으로 이동한다', () => {
    const response = adminDomainBoundary(new Request('https://veroro-admin.netlify.app/?source=qa'));
    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe('https://veroro-admin.netlify.app/admin?source=qa');
    expect(adminDomainBoundary(new Request('https://veroro-app.netlify.app/'))).toBeUndefined();
  });
});
