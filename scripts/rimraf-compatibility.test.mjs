import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';

const require = createRequire(import.meta.url);

test('preserves the CommonJS rimraf.sync shape used by Capacitor iOS build/migrate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rimraf-compat-synthetic-'));
  try {
    const target = join(root, 'synthetic app.xcarchive');
    await mkdir(target);
    await writeFile(join(target, 'synthetic.txt'), 'fixture');
    await writeFile(join(root, 'keep.txt'), 'preserved');
    const cjs = require('rimraf');
    assert.equal(cjs.rimraf.sync(target), true);
    await assert.rejects(access(target));
    assert.equal(await readFile(join(root, 'keep.txt'), 'utf8'), 'preserved');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('preserves ESM async glob selection without removing adjacent files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rimraf-glob-synthetic-'));
  try {
    await writeFile(join(root, '합성 파일.tmp'), 'fixture');
    await writeFile(join(root, 'another.tmp'), 'fixture');
    await writeFile(join(root, 'keep.txt'), 'preserved');
    assert.equal(await rimraf(join(root, '*.tmp'), { glob: true }), true);
    await assert.rejects(access(join(root, '합성 파일.tmp')));
    await assert.rejects(access(join(root, 'another.tmp')));
    assert.equal(await readFile(join(root, 'keep.txt'), 'utf8'), 'preserved');
  } finally { await rm(root, { recursive: true, force: true }); }
});
