import assert from 'node:assert/strict';

export const PRODUCT_PUBLICATION_MIGRATION = '20261027010000_require_product_review_for_publication.sql';

export async function assertPublicationMigrationPreservesIntent(db, applyMigration) {
  const fixtureIds = ['e1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002'];
  await db.query(`INSERT INTO public.products(id,name,brand_name,is_visible,verification_status) VALUES
    ($1,'Pending publication intent','Migration fixture',true,'pending'),
    ($2,'Hidden reviewed intent','Migration fixture',false,'reviewed')`, fixtureIds);
  const snapshot = async () => (await db.query('SELECT * FROM public.products WHERE id = ANY($1::UUID[]) ORDER BY id', [fixtureIds])).rows;
  const before = await snapshot();
  await applyMigration();
  assert.deepEqual(await snapshot(), before, 'publication migration preserves existing rows without auto-verifying or hiding');
  await db.query('DELETE FROM public.products WHERE id = ANY($1::UUID[])', [fixtureIds]);
}

// Runs against the actual complete migration ledger in validate-local-bootstrap.
// The transaction deliberately admits legacy malformed rows so the public gate,
// rather than a write-time CHECK constraint, must reject null/unknown statuses.
export async function assertProductPublication(db) {
  const ids = Array.from({ length: 9 }, (_, index) => `e0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  const expectedReviewedAndVerified = [ids[1], ids[2]];
  const expectedVerified = [ids[2]];
  const allIds = async (sql, params = [ids]) => (await db.query(sql, params)).rows.map((row) => row.product_id).sort();
  const fixtures = [
    ['pending', true], ['reviewed', true], ['verified', true],
    [null, true], ['unknown', true], ['reviewed', false],
    ['verified', false], ['verified', null], ['pending', false],
  ];
  await db.exec('BEGIN');
  try {
    await db.exec(`
      ALTER TABLE public.products DROP CONSTRAINT products_verification_status_check;
      ALTER TABLE public.products ALTER COLUMN verification_status DROP NOT NULL;
      ALTER TABLE public.products ALTER COLUMN is_visible DROP NOT NULL;
    `);
    for (const [index, [status, visible]] of fixtures.entries()) {
      await db.query(`INSERT INTO public.products(id,name,brand_name,barcode,product_type,main_category,target_pet_type,verification_status,is_visible)
        VALUES ($1,$2,'Publication fixture',$5,'food','사료','dog',$3,$4)`,
      [ids[index], `Publication witness ${index + 1}`, status, visible, `880999999999${index}`]);
    }
    await db.query(`
      INSERT INTO public.product_aliases(product_id,alias_text,normalized_alias,alias_type)
        SELECT id,'publication-alias-witness','publication-alias-witness','other' FROM public.products WHERE id = ANY($1::UUID[]);
    `, [ids]);
    await db.query(`INSERT INTO public.ingredients(id,name_ko,name_en,risk_level)
      VALUES ($1,'공개 게이트 검증 원료','PublicationIngredientWitness','safe')`, [ids[0]]);
    await db.query(`INSERT INTO public.product_ingredients(product_id,ingredient_id)
      SELECT id,$2 FROM public.products WHERE id = ANY($1::UUID[])`, [ids, ids[0]]);
    await db.query(`INSERT INTO public.nutritional_profiles(product_id)
      SELECT id FROM public.products WHERE id = ANY($1::UUID[])`, [ids]);
    await db.query(`INSERT INTO public.analysis_results(product_id)
      SELECT id FROM public.products WHERE id = ANY($1::UUID[])`, [ids]);
    await db.query(`INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,is_current)
      SELECT id,id,'PublicationIngredientWitness',true FROM public.products WHERE id = ANY($1::UUID[])`, [ids]);
    await db.query(`INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text,match_status)
      SELECT id,0,'PublicationIngredientWitness','unmatched' FROM public.products WHERE id = ANY($1::UUID[])`, [ids]);
    await db.query(`INSERT INTO public.reviews(product_id,rating)
      SELECT id,4 FROM public.products WHERE id = ANY($1::UUID[])`, [ids]);

    const stateBefore = (await db.query('SELECT id,is_visible,verification_status FROM public.products WHERE id = ANY($1::UUID[]) ORDER BY id', [ids])).rows;
    const assertPublicSurfaces = async (expected, context) => {
      for (const role of ['anon', 'authenticated']) {
        await db.exec(`SET ROLE ${role}`);
        try {
          assert.deepEqual(await allIds('SELECT id AS product_id FROM public.products WHERE id = ANY($1::UUID[])'), expected, `${context}/${role}: public catalog allowlist`);
          for (const id of ids) {
            assert.deepEqual(await allIds('SELECT id AS product_id FROM public.products WHERE id=$1', [id]), expected.includes(id) ? [id] : [], `${context}/${role}: direct detail ${id}`);
          }
          for (const query of ['', 'Publication witness', '880999999999', 'publication-alias-witness', 'PublicationIngredientWitness']) {
            assert.deepEqual(await allIds('SELECT product_id FROM public.search_catalog_products($1) WHERE product_id = ANY($2::UUID[])', [query, ids]), expected, `${context}/${role}: search ${query}`);
          }
          for (const table of ['product_aliases', 'product_ingredients', 'nutritional_profiles', 'analysis_results', 'product_ingredient_label_sets', 'product_ratings']) {
            assert.deepEqual(await allIds(`SELECT product_id FROM public.${table} WHERE product_id = ANY($1::UUID[])`), expected, `${context}/${role}: direct ${table}`);
          }
          assert.deepEqual(await allIds('SELECT label_set_id AS product_id FROM public.product_ingredient_label_items WHERE label_set_id = ANY($1::UUID[])'), expected, `${context}/${role}: direct label items`);
          assert.deepEqual(await allIds('SELECT id AS product_id FROM public.products_with_compatibility WHERE id = ANY($1::UUID[])'), expected, `${context}/${role}: compatibility view`);
        } finally { await db.exec('RESET ROLE'); }
      }
    };
    const setVerifiedOnly = async (value) => db.query("UPDATE public.app_settings SET value=$1::JSONB WHERE key='hide_unverified_products'", [JSON.stringify(value)]);
    await setVerifiedOnly(false);
    await assertPublicSurfaces(expectedReviewedAndVerified, 'verified-only off');
    await setVerifiedOnly(true);
    await assertPublicSurfaces(expectedVerified, 'verified-only on');
    await db.exec("DELETE FROM public.app_settings WHERE key='hide_unverified_products'");
    await assertPublicSurfaces(expectedReviewedAndVerified, 'missing optional setting');
    await db.exec("INSERT INTO public.app_settings(key,value,is_public) VALUES ('hide_unverified_products','false',true)");

    // A legacy/new permissive read policy must not be able to widen this boundary.
    for (const table of ['products', 'product_aliases', 'product_ingredients', 'nutritional_profiles', 'analysis_results', 'product_ingredient_label_sets', 'product_ingredient_label_items']) {
      await db.exec(`CREATE POLICY publication_regression_allow_all ON public.${table} FOR SELECT TO anon, authenticated USING (true)`);
    }
    await assertPublicSurfaces(expectedReviewedAndVerified, 'additional permissive policies');
    await setVerifiedOnly(true);
    await assertPublicSurfaces(expectedVerified, 'additional permissive policies/verified-only on');
    await setVerifiedOnly(false);

    await db.exec('SET ROLE service_role');
    assert.deepEqual(await allIds('SELECT id AS product_id FROM public.products WHERE id = ANY($1::UUID[])'), ids, 'admin retains every review candidate');
    for (const table of ['product_aliases', 'product_ingredients', 'nutritional_profiles', 'analysis_results', 'product_ingredient_label_sets']) {
      assert.deepEqual(await allIds(`SELECT product_id FROM public.${table} WHERE product_id = ANY($1::UUID[])`), ids, `admin retains ${table}`);
    }
    assert.deepEqual((await db.query('SELECT id,is_visible,verification_status FROM public.products WHERE id = ANY($1::UUID[]) ORDER BY id', [ids])).rows, stateBefore, 'reads never rewrite visibility intent or review status');
    await db.query("UPDATE public.products SET verification_status='pending' WHERE id=$1", [ids[2]]);
    await db.exec('RESET ROLE');
    await assertPublicSurfaces([ids[1]], 'verified returned to pending');
    await db.exec('SET ROLE service_role');
    assert.deepEqual((await db.query('SELECT is_visible,verification_status FROM public.products WHERE id=$1', [ids[2]])).rows, [{ is_visible: true, verification_status: 'pending' }], 'return to review preserves requested visibility');
    await db.query("UPDATE public.products SET verification_status='reviewed' WHERE id=$1", [ids[0]]);
    await db.exec('RESET ROLE');
    await assertPublicSurfaces([ids[0], ids[1]], 'admin review enables eligible product');
    console.log('PASS: product publication RLS, direct evidence/views/search, verified-only setting, restrictive-policy bypass guard, admin review transitions');
  } finally {
    await db.exec('ROLLBACK; RESET ROLE');
  }
}
