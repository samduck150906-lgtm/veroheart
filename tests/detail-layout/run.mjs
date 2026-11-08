import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'tests/detail-layout/vite.config.ts'], { stdio: 'inherit' });
assert.equal(build.status, 0, 'Synthetic fixture build');
const root = resolve('.artifacts/detail-layout-app');
const output = resolve('.artifacts/detail-layout-results');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, `.${new URL(req.url, 'http://fixture.local').pathname === '/' ? '/index.html' : new URL(req.url, 'http://fixture.local').pathname}`);
    assert.ok(path.startsWith(root + sep));
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
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
    assert.equal(await page.locator('body').getAttribute('data-share-clicks'), '1', 'Real share handler uses synthetic navigator adapter');
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
  await writeFile(`${output}/results.json`, JSON.stringify({ synthetic: true, cases: results.length, results,
    limits: ['Synthetic public read responses and navigator share adapter', 'Fallback fonts; not operating HTTP/Auth', '34px inset and 200% reflow equivalent, not real iOS hardware or OS zoom'] }, null, 2));
  console.log(`Synthetic detail layout: ${results.length} cases passed; no external service or operating writes`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
