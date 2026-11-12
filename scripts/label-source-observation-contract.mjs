import assert from 'node:assert/strict';

export async function assertLabelSourceObservations(db) {
  await db.exec('BEGIN');
  try {
    await db.exec(`
      INSERT INTO public.products(id,name,brand_name,product_type,is_visible,verification_status)
        VALUES('95000000-0000-4000-8000-000000000001','Label fixture','Fixture','food',false,'pending');
      INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,source_reference,is_current)
        VALUES('96000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','Source fixture A, Source fixture B','https://example.org/source-label',true);
      INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text)
        VALUES('96000000-0000-4000-8000-000000000001',1,'Source fixture A'),('96000000-0000-4000-8000-000000000001',2,'Source fixture B');
      INSERT INTO public.ingredient_label_source_documents(source_url,document_sha256,observed_at,raw_label_text,ordered_items,evidence_note)
        VALUES('https://example.org/source-label',repeat('a',64),'2026-11-09','Source fixture A, Source fixture B',
          '[{"order":1,"raw":"Source fixture A"},{"order":2,"raw":"Source fixture B"}]','Synthetic source fixture; rolled back');
    `);
    const count = async () => (await db.query(`SELECT count(*)::int n FROM public.product_ingredient_label_items i
      WHERE i.label_set_id='96000000-0000-4000-8000-000000000001' AND public.label_source_evidence(i) IS NOT NULL`)).rows[0].n;
    assert.equal(await count(),2);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.product_ingredient_label_items WHERE label_set_id='96000000-0000-4000-8000-000000000001' AND match_status='unmatched'")).rows[0].n,2);
    await db.exec("UPDATE public.product_ingredient_label_items SET raw_ingredient_text='Changed source fixture' WHERE label_set_id='96000000-0000-4000-8000-000000000001' AND display_order=2");
    assert.equal(await count(),1);
    await db.exec("UPDATE public.product_ingredient_label_items SET raw_ingredient_text='Source fixture B' WHERE label_set_id='96000000-0000-4000-8000-000000000001' AND display_order=2");
    assert.equal(await count(),2);
    await db.exec("UPDATE public.product_ingredient_label_items SET parser_metadata=parser_metadata||'{\"unrelatedTraitChange\":true}'::jsonb WHERE label_set_id='96000000-0000-4000-8000-000000000001'");
    assert.equal(await count(),2);
    await db.exec("UPDATE public.product_ingredient_label_sets SET source_reference='https://example.org/different-source' WHERE id='96000000-0000-4000-8000-000000000001'");
    assert.equal(await count(),0);
    await db.exec('SET LOCAL ROLE anon');
    assert.equal((await db.query(`SELECT count(*)::int n FROM public.ingredient_label_source_observations o
      JOIN public.product_ingredient_label_items i ON i.id=o.label_item_id WHERE i.label_set_id='96000000-0000-4000-8000-000000000001'`)).rows[0].n,0);
    await db.exec('RESET ROLE');
    assert.equal((await db.query("SELECT has_table_privilege('anon','public.ingredient_label_source_observations','INSERT') allowed")).rows[0].allowed,false);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.ingredient_label_comparisons WHERE product_id='95000000-0000-4000-8000-000000000001'")).rows[0].n,0);
    console.log('PASS: source-confirmed rows remain confirmed with unknown traits; raw/source revisions invalidate independently; hidden product observations are private; no fabricated safety approval');
  } finally { await db.exec('ROLLBACK'); }
}
