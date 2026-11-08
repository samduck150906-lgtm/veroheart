import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withFixtureServer } from './fixture-server.mjs';

test('serves only the synthetic directory over GET and closes after success', async () => {
  const root = await mkdtemp(join(tmpdir(), 'detail-server-synthetic-'));
  let origin;
  try {
    await writeFile(join(root, 'index.html'), '<h1>Synthetic only</h1>');
    await withFixtureServer(root, async base => {
      origin = base;
      assert.equal(new URL(base).hostname, '127.0.0.1');
      const response = await fetch(base);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), '<h1>Synthetic only</h1>');
      assert.equal((await fetch(`${base}/missing`)).status, 404);
      assert.equal((await fetch(`${base}/../package.json`)).status, 404);
      assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    });
    await assert.rejects(fetch(origin, { signal: AbortSignal.timeout(1000) }));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('closes after browser-startup or assertion failure without swallowing it', async () => {
  for (const message of ['synthetic browser startup failure', 'synthetic assertion failure']) {
    let origin;
    await assert.rejects(withFixtureServer(tmpdir(), async base => {
      origin = base;
      throw new Error(message);
    }), { message });
    await assert.rejects(fetch(origin, { signal: AbortSignal.timeout(1000) }));
  }
});
