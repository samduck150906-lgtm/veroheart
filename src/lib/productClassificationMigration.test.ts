// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('product category consistency migration', () => {
  it('repairs existing category/type disagreements and normalizes future writes without changing visibility', async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE TABLE public.products (id text PRIMARY KEY, main_category text, sub_category text, product_type text DEFAULT 'food', is_visible boolean);
        INSERT INTO products VALUES ('hidden-snack', ' 간식 ', NULL, 'food', false), ('uncategorized', '', NULL, 'supplement', true), ('custom', '처방식', NULL, 'food', false);`);
      const migration = resolve(process.cwd(), 'supabase/migrations/20261026180000_product_category_consistency.sql');
      await db.exec(readFileSync(migration, 'utf8'));
      expect((await db.query('SELECT * FROM products ORDER BY id')).rows).toEqual([
        { id: 'custom', main_category: '처방식', sub_category: null, product_type: 'food', is_visible: false },
        { id: 'hidden-snack', main_category: '간식', sub_category: null, product_type: 'snack', is_visible: false },
        { id: 'uncategorized', main_category: '영양제', sub_category: null, product_type: 'supplement', is_visible: true },
      ]);
      await db.exec(`INSERT INTO products(id,main_category,sub_category,is_visible) VALUES ('new','영양제',' 유산균 ',true);
        UPDATE products SET main_category='간식' WHERE id='new';`);
      expect((await db.query("SELECT product_type, main_category, sub_category, is_visible FROM products WHERE id='new'")).rows[0])
        .toEqual({ product_type: 'snack', main_category: '간식', sub_category: '유산균', is_visible: true });
      // Migration replay and routine edits also preserve explicit hidden states.
      await db.exec(readFileSync(migration, 'utf8'));
      expect((await db.query("SELECT is_visible FROM products WHERE id='hidden-snack'")).rows[0]).toEqual({ is_visible: false });
    } finally { await db.close(); }
  });
});
