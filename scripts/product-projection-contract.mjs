import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const identifier = value => {
  assert.match(value, /^[a-z_][a-z_0-9]*$/i);
  return `"${value}"`;
};
export function parseProjection(text) {
  const pieces = []; let depth = 0; let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;
    if (text[i] === ',' && depth === 0) { pieces.push(text.slice(start, i)); start = i + 1; }
    assert.ok(depth >= 0, 'Unbalanced projection');
  }
  assert.equal(depth, 0);
  pieces.push(text.slice(start));
  return pieces.filter(p => p.trim()).map(piece => {
    const match = piece.trim().match(/^([a-z_0-9]+)(?:!([a-z_0-9]+))?\s*(?:\(([\s\S]*)\))?$/i);
    assert.ok(match, `Unsupported public product projection: ${piece}`);
    return { name: match[1], hint: match[2], children: match[3] === undefined ? null : parseProjection(match[3]) };
  });
}

/** Checks actual SQL columns/FKs, not a mocked JS row or a live PostgREST service. */
export async function assertPublicProductProjectionContract(db) {
  const source = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
  const blocks = [...source.matchAll(/\.select\(`([\s\S]*?)`\)/g)].map(m => m[1]).filter(s => /\bbrand_name\b/.test(s));
  assert.ok(blocks.length >= 7);
  let checked = 0;
  async function check(table, tree) {
    const fields = tree.filter(n => !n.children).map(n => n.name);
    if (fields.length) await db.query(`SELECT ${fields.map(identifier).join(',')} FROM public.${identifier(table)} LIMIT 0`);
    checked++;
    for (const child of tree.filter(n => n.children)) {
      const relations = (await db.query(`SELECT c.conname, a.attname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
        WHERE c.contype='f' AND ((c.conrelid=to_regclass($1) AND c.confrelid=to_regclass($2))
          OR (c.conrelid=to_regclass($2) AND c.confrelid=to_regclass($1)))`, [`public.${table}`, `public.${child.name}`])).rows;
      assert.ok(relations.some(r => !child.hint || r.conname === child.hint || r.attname === child.hint), `${table} -> ${child.name}!${child.hint ?? ''}: missing FK`);
      await check(child.name, child.children);
    }
  }
  for (const block of blocks) {
    const tree = parseProjection(block);
    const wrapper = tree.find(n => n.name === 'products' && n.children);
    await check('products', wrapper?.children ?? tree);
  }
  return { projections: blocks.length, tableChecks: checked };
}
