// Real local PostgreSQL regression for the observed 42703; no hosted DB/HTTP.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const sql = await readFile(new URL('../supabase/migration_drafts/restore_product_source_contract.sql', import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, brand_name TEXT, is_visible BOOLEAN, verification_status TEXT, barcode TEXT);
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY public_products ON products FOR SELECT TO anon,authenticated USING (is_visible AND verification_status IN ('reviewed','verified'));
    GRANT USAGE ON SCHEMA public TO anon,authenticated; GRANT SELECT ON products TO anon,authenticated;
    INSERT INTO products VALUES (1,'synthetic visible','fixture',true,'reviewed','0123'),
      (2,'synthetic hidden','fixture',false,'verified',NULL),(3,'synthetic pending','fixture',true,'pending',NULL);
    ALTER TABLE products ADD COLUMN name_upper TEXT GENERATED ALWAYS AS (upper(name)) STORED;
    ALTER TABLE products ADD CONSTRAINT nonempty_name CHECK(length(name)>0);
    CREATE INDEX products_barcode_fixture ON products(barcode) WHERE barcode IS NOT NULL;
    CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version TEXT PRIMARY KEY);
    INSERT INTO supabase_migrations.schema_migrations VALUES ('synthetic-existing');`);
  const rowsBefore = (await db.query('SELECT * FROM products ORDER BY id')).rows;
  const policiesBefore = (await db.query('SELECT * FROM pg_policies WHERE tablename=\'products\'')).rows;
  const grantsBefore = (await db.query('SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name=\'products\' ORDER BY 1,2')).rows;
  const objects = async () => (await db.query(`SELECT 'index' kind,indexname name,indexdef definition FROM pg_indexes WHERE tablename='products'
    UNION ALL SELECT 'constraint',conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='products'::regclass ORDER BY 1,2`)).rows;
  const objectsBefore = await objects();
  const projection = 'SELECT id,name,brand_name,catalog_source_url,catalog_source_note,requires_veterinary_guidance FROM products ORDER BY id';
  await assert.rejects(db.query(projection), e => e.code === '42703' && /catalog_source_url/.test(e.message));
  await db.exec(sql);
  const rowsAfter = (await db.query('SELECT id,name,brand_name,is_visible,verification_status,barcode,name_upper FROM products ORDER BY id')).rows;
  assert.deepEqual(rowsAfter, rowsBefore, 'existing identity/visibility/barcode values preserved');
  assert.deepEqual((await db.query(projection)).rows.map(r => [r.catalog_source_url,r.catalog_source_note,r.requires_veterinary_guidance]), [[null,null,false],[null,null,false],[null,null,false]]);
  assert.deepEqual((await db.query('SELECT * FROM pg_policies WHERE tablename=\'products\'')).rows, policiesBefore);
  assert.deepEqual((await db.query('SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name=\'products\' ORDER BY 1,2')).rows, grantsBefore);
  assert.deepEqual((await db.query('SELECT * FROM supabase_migrations.schema_migrations')).rows, [{version:'synthetic-existing'}]);
  const objectsAfter = await objects();
  assert.deepEqual(objectsAfter.filter(o => objectsBefore.some(b => b.kind === o.kind && b.name === o.name)), objectsBefore);
  assert.deepEqual(objectsAfter.filter(o => !objectsBefore.some(b => b.kind === o.kind && b.name === o.name)), [
    { kind: 'constraint', name: 'products_requires_veterinary_guidance_not_null', definition: 'NOT NULL requires_veterinary_guidance' },
  ]);
  await db.exec(sql); // repeat adds no duplicate columns and preserves explicit evidence
  await db.exec("UPDATE products SET catalog_source_url='https://manufacturer.example/fixture',catalog_source_note='synthetic evidence',requires_veterinary_guidance=true WHERE id=1;");
  await db.exec(sql);
  assert.equal((await db.query(projection)).rows[0].requires_veterinary_guidance, true);
  assert.equal((await db.query(projection)).rows[0].catalog_source_url, 'https://manufacturer.example/fixture');
  for (const role of ['anon','authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    assert.deepEqual((await db.query(projection)).rows.map(r => r.id), [1]);
    await assert.rejects(db.exec("UPDATE products SET name='forbidden' WHERE id=1"), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.exec('ALTER TABLE products ALTER COLUMN catalog_source_note TYPE INTEGER USING NULL;');
  await assert.rejects(db.exec(sql), /Incompatible existing products.catalog_source_note/);
  await db.exec('ROLLBACK;');
  await db.exec('ALTER TABLE products DROP COLUMN catalog_source_note; ALTER TABLE products ADD COLUMN catalog_source_note TEXT;');
  await db.exec("UPDATE products SET catalog_source_url='https://manufacturer.example/fixture?token=synthetic' WHERE id=1;");
  await assert.rejects(db.exec(sql), /Potentially private/);
  await db.exec('ROLLBACK;');
  assert.equal((await db.query('SELECT catalog_source_url FROM products WHERE id=1')).rows[0].catalog_source_url,'https://manufacturer.example/fixture?token=synthetic');
  await db.exec('ALTER TABLE products DROP COLUMN catalog_source_note; ALTER TABLE products ADD COLUMN catalog_source_note TEXT GENERATED ALWAYS AS (name) STORED;');
  await assert.rejects(db.exec(sql), /Incompatible existing products.catalog_source_note/);
  await db.exec('ROLLBACK;');
  console.log(JSON.stringify({passed:true,missingColumnReproduced:true,schemaOnlyDraft:true,explicitEvidencePreserved:true,rlsAndGrantsPreserved:true,historyUnchanged:true,incompatibleDriftRejected:true}));
} finally { await db.close(); }

// Each single missing dependency must be restored without erasing other source values.
for (const missing of ['catalog_source_url','catalog_source_note','requires_veterinary_guidance']) {
  const fixture = new PGlite();
  try {
    await fixture.exec(`CREATE TABLE products(id INTEGER PRIMARY KEY,
      catalog_source_url TEXT, catalog_source_note TEXT, requires_veterinary_guidance BOOLEAN NOT NULL DEFAULT FALSE);
      INSERT INTO products VALUES(1,'https://manufacturer.example/fixture','fixture evidence',true);
      ALTER TABLE products DROP COLUMN ${missing};`);
    await assert.rejects(fixture.query('SELECT catalog_source_url,catalog_source_note,requires_veterinary_guidance FROM products'), e => e.code === '42703');
    const before = (await fixture.query('SELECT * FROM products')).rows[0];
    await fixture.exec(sql);
    const after = (await fixture.query('SELECT * FROM products')).rows[0];
    for (const [key,value] of Object.entries(before)) assert.deepEqual(after[key],value);
  } finally { await fixture.close(); }
}
console.log('PASS: each missing metadata column restored; generated-column drift rejected; existing objects preserved');
