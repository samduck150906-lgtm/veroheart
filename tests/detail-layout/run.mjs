import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { withFixtureServer } from './fixture-server.mjs';

const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'tests/detail-layout/vite.config.ts'], { stdio: 'inherit' });
assert.equal(build.status, 0, 'Synthetic fixture build');
const root = resolve('.artifacts/detail-layout-app');
const output = resolve('.artifacts/detail-layout-results');
await mkdir(output, { recursive: true });
await withFixtureServer(root, async base => {
const browser = await chromium.launch();
const results = [];
const evidenceResults = [];
try {
  const sizes = [360, 390, 430, 1280].map(width => ({ width, height: 844, label: String(width), scale: 1 }));
  // 1280 physical pixels at 200% reflow-equivalent CSS viewport. This is not
  // an OS zoom setting or real mobile pinch-zoom/Safari safe-area certification.
  sizes.push({ width: 640, height: 450, label: 'desktop-200pct-reflow', scale: 2 });
  for (const size of sizes) for (const safeArea of [0, 34]) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if (new URL(route.request().url()).origin === base) return route.continue();
      // Use fallback fonts deterministically; no external service is contacted.
      if (route.request().resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '/* synthetic fallback font */' });
      errors.push(`Unexpected external transport: ${new URL(route.request().url()).origin}`);
      return route.abort();
    });
    await page.goto(`${base}/?safeArea=${safeArea}`);
    await page.getByRole('heading', { name: '후기 3', exact: true }).waitFor();
    // Wait for the real entrance animation to release its temporary transform
    // containing block before measuring fixed footer geometry; do not disable it.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.detail-page-root')).transform === 'none'
      && !document.querySelector('[aria-label="제품 액션"]').getAnimations().some(a => a.playState === 'running'));
    const tools = page.getByRole('group', { name: '빠른 이동 버튼' });
    assert.equal(await page.locator('.bottom-nav').count(), 0, 'Actual detail route has no bottom navigation');
    await page.locator('.app-main').evaluate(el => { el.scrollTop = el.scrollHeight / 3; });
    await page.waitForFunction(() => document.querySelector('.app-main').scrollTop > 320);
    const middle = await tools.evaluate(el => ({ position: getComputedStyle(el).position, y: el.getBoundingClientRect().top }));
    assert.notEqual(middle.position, 'fixed');
    assert.ok(middle.y >= size.height, 'End-of-page tools must not float over mid-page evidence');
    const header = page.locator('.app-header');
    for (const label of ['뒤로', '공유']) {
      const rect = await header.getByRole('button', { name: label, exact: true }).boundingBox();
      assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= size.height, 'Existing header actions remain visible mid-page');
    }
    assert.ok(await page.locator('header').evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('main')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'Header precedes content in reading order');
    await header.getByRole('button', { name: '뒤로', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '공유');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('body').getAttribute('data-share-clicks'), '1', 'Existing header share remains available mid-page');
    await page.locator('.app-main').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await tools.getByRole('button', { name: '맨 위로 이동', exact: true }).waitFor();
    const geometry = await tools.evaluate(el => {
      const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
      return { tools: box(el), lastContent: box(el.previousElementSibling), cta: box(document.querySelector('[aria-label="제품 액션"]')),
        buttons: [...el.querySelectorAll('button')].map(box), clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
    });
    console.log(JSON.stringify({ size: size.label, safeArea, geometry }));
    await page.screenshot({ path: `${output}/${size.label}-safe${safeArea}.png` });
    assert.ok(geometry.lastContent.bottom <= geometry.tools.y, 'Last content precedes tool group');
    assert.ok(geometry.tools.bottom < geometry.cta.y, 'All tools stay reachable above padded action bar');
    assert.ok(geometry.lastContent.bottom < geometry.cta.y, 'Last review is not obscured');
    assert.ok(geometry.cta.height >= 75 + safeArea, 'Synthetic extra footer safe-area is applied');
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, 'No horizontal overflow');
    for (const b of geometry.buttons) assert.ok(b.x >= 0 && b.right <= size.width + 1 && b.width >= 44 && b.height >= 44);
    await tools.getByRole('button', { name: '공유하기', exact: true }).click();
    assert.equal(await page.locator('body').getAttribute('data-share-clicks'), '2', 'Real share handler uses synthetic navigator adapter');
    await tools.getByRole('button', { name: '뒤로 가기', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '공유하기');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '맨 위로 이동');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.app-main').scrollTop < 2);
    await page.locator('.app-main').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await tools.getByRole('button', { name: '뒤로 가기', exact: true }).click();
    await page.getByRole('heading', { name: '합성 이전 화면' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: '섭취 기록 추가', exact: true }).click();
    await page.getByRole('heading', { name: '합성 로그인 화면' }).waitFor();
    assert.deepEqual(errors, []);
    results.push({ size: size.label, cssWidth: size.width, deviceScaleFactor: size.scale, simulatedInset: safeArea, geometry,
      backShareTopAndGuestLogPassed: true, externalRequests: 0, operatingWrites: 0 });
    await context.close();
  }
  for (const width of [390, 1280]) for (const evidence of ['unverified', 'not_requested', 'unavailable', 'error', 'absent', 'stale', 'verified']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin === base) return route.continue();
      if (route.request().resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      errors.push('Unexpected external request');return route.abort();
    });
    await page.goto(`${base}/?evidence=${evidence}`);
    const card = page.locator('[aria-label="사료성분 분석"]');
    await card.waitFor();
    const text = await card.innerText();
    const expectedNotice = { unverified:'전성분 라벨 전체 대조 근거가 확인되지 않아',
      not_requested:'증거를 아직 조회하지 않아', unavailable:'조회 경로가 준비되지 않아',
      error:'증거를 불러오지 못해', absent:'전체 대조 완료 증거가 없어', stale:'증거가 오래되어' };
    const withheld = text.includes('검토 중');
    assert.equal(withheld, evidence !== 'verified');
    if (evidence !== 'verified') assert.ok(text.includes(expectedNotice[evidence]), `Missing accurate notice: ${evidence}`);
    await card.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${output}/evidence-${evidence}-${width}.png` });
    assert.deepEqual(errors, []);
    evidenceResults.push({ width, evidence, withheld, syntheticTransport: true });
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ synthetic: true, cases: results.length, results,
    evidenceCases: evidenceResults.length, evidenceResults,
    limits: ['Synthetic public read responses and navigator share adapter', 'Fallback fonts; not operating HTTP/Auth', '34px inset and 200% reflow equivalent, not real iOS hardware or OS zoom'] }, null, 2));
  console.log(`Synthetic detail layout: ${results.length} cases passed; no external service or operating writes`);
  console.log(`Synthetic label evidence: ${evidenceResults.length} cases passed`);
} finally {
  await browser.close();
}
});
