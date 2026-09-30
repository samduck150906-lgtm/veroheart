import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

const productionLedgerFiles = `
20250403120000_veroro_schema.sql
20260408090000_personalized_allergy_scoring.sql
20260409093000_add_product_verification_and_affiliate_fields.sql
20260411120000_add_coupang_link_to_products.sql
20260524140000_aafco_2024_modernization.sql
20260611142015_create_banners.sql
20260611142131_analysis_engine_data_load.sql
20260611142147_unmatched_ingredients_queue.sql
20260611151005_supplement_image_label_ingredients.sql
20260621035856_compatibility_score_schema.sql
20260621040027_create_community_posts.sql
20260621040102_add_monetization.sql
20260621040653_create_community_comments.sql
20260621041820_community_post_likes_and_view.sql
20260702134231_add_barcode_to_products.sql
20260702152508_public_read_user_profiles.sql
20260723131349_pet_feeding_logs.sql
20260723131442_harden_feeding_log_trigger_search_path.sql
20260728104426_feeding_log_photo_storage.sql
20260728142725_admin_console_operations.sql
20260728143352_tighten_product_images_bucket_listing.sql
20260825064411_enforce_signup_enabled.sql
20260825064534_revoke_public_execute_on_signup_gate.sql
20260903042750_nutritional_profiles_allow_unknown.sql
20260914144340_tighten_banner_and_queue_rls.sql
20260914144348_launch_waitlist.sql
20260914144404_reconcile_auth_users_and_settings.sql
20260914144413_add_product_visibility.sql
20260914144425_enrich_ingredient_nutrition_schema.sql
20260914144524_enrich_existing_ingredient_dictionary.sql
20260914144655_sync_product_review_aggregates.sql
20260914144713_sync_product_risk_factors.sql
20260914144745_product_enrichment_workflow.sql
20260914144755_tighten_public_profiles_and_definers.sql
20260914144953_product_categories_and_pinning.sql
20260914145039_normalize_product_main_category.sql
20260914150105_admin_trash.sql
20260914150249_unique_nicknames.sql
20260914152647_product_subcategories.sql
20260914153416_hide_unverified_products_setting.sql
20260915002845_product_price_proposals.sql
20260916061242_product_requests.sql
20260916064901_public_product_visibility_rls.sql
20260916065602_move_visibility_gate_out_of_api_schema.sql
20260922053808_rank_products_with_ingredients_first.sql
20260922081740_veroheart_legacy_import.sql
20260922084657_veroheart_legacy_import_dedup_fix.sql
20260922090439_veroheart_legacy_import_cleanup.sql
20260925100000_community_catalog_foundation.sql
20260925110000_ranked_catalog_search.sql
20260925120000_catalog_backfill_apply_rpc.sql
20260925130000_community_scan_submissions.sql
20260925140000_scan_rate_limit_rpc.sql
20260925150000_scan_processing_rpc.sql
20260925160000_publish_community_scan.sql
20260925170000_scan_evidence_retention.sql
20260925180000_ingredient_source_dimensions.sql
20260925190000_label_item_ingestion.sql
20260925200000_allergen_family_relationships.sql
20260925210000_ingredient_reanalysis_queue.sql
20260928200000_activate_legacy_ingredient_identity.sql
`.trim().split('\n');

const retiredLocalFiles = `
20260604235000_create_banners.sql
20260611140000_analysis_engine_data_load.sql
20260611150000_unmatched_ingredients_queue.sql
20260611160000_supplement_image_label_ingredients.sql
20260621000000_add_monetization.sql
20260621000000_compatibility_score_schema.sql
20260621120000_add_barcode_column.sql
20260621120000_create_community_posts.sql
20260621130000_create_community_comments.sql
20260621130000_seed_50_products.sql
20260621140000_community_tables.sql
20260702000000_add_barcode_to_products.sql
20260702120000_public_read_user_profiles.sql
20260714120000_tighten_banner_and_queue_rls.sql
20260715000000_launch_waitlist.sql
20260723120000_pet_feeding_logs.sql
20260728120000_feeding_log_photo_storage.sql
20260728140000_admin_console_operations.sql
20260825120000_enforce_signup_enabled.sql
20260903120000_nutritional_profiles_allow_unknown.sql
20260910120000_reconcile_auth_users_and_settings.sql
20260911090000_add_product_visibility.sql
20260911100000_enrich_ingredient_nutrition_schema.sql
20260911102000_enrich_existing_ingredient_dictionary.sql
20260911103000_seed_standard_feed_nutrition.sql
20260911110000_sync_product_review_aggregates.sql
20260911111000_sync_product_risk_factors.sql
20260911112000_tighten_public_profiles_and_definers.sql
20260911113000_product_enrichment_workflow.sql
20260914090000_product_categories_and_pinning.sql
20260914100000_admin_trash.sql
20260914110000_unique_nicknames.sql
20260914120000_product_subcategories.sql
20260915090000_product_price_proposals.sql
20260916090000_product_requests.sql
20260916100000_public_product_visibility_rls.sql
20260916110000_move_visibility_gate_to_private.sql
20260922060000_rank_products_with_ingredients_first.sql
`.trim().split('\n');

describe('Supabase migration ledger reconciliation', () => {
  it('keeps valid filenames with unique timestamp versions', () => {
    expect(migrationFiles.every((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))).toBe(true);
    const versions = migrationFiles.map((file) => file.slice(0, 14));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('contains every production ledger migration and the retained canonical foundation', () => {
    expect(productionLedgerFiles).toHaveLength(61);
    expect(productionLedgerFiles.every((file) => migrationFiles.includes(file))).toBe(true);
    expect(migrationFiles).toHaveLength(62);
    expect(migrationFiles).toContain('20260630090000_non_destructive_ingredient_schema.sql');
  });

  it('does not reintroduce retired timestamps or the separate cleanup migration', () => {
    expect(retiredLocalFiles.some((file) => migrationFiles.includes(file))).toBe(false);
    expect(migrationFiles).not.toContain('20260929230000_atomic_product_cleanup.sql');
  });

  it('keeps the standard-feed dataset outside automatic migration paths', () => {
    const referencePath = join(
      process.cwd(),
      'supabase/reference-data/standard_feed_nutrition_reference.sql',
    );
    expect(basename(referencePath)).not.toMatch(/^\d{14}_/);
    const sql = readFileSync(referencePath, 'utf8');
    const embedded = sql.match(/\$feed\$([\s\S]*?)\$feed\$/)?.[1];
    expect(embedded).toBeTruthy();

    const rows = JSON.parse(embedded!) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(181);
    expect(new Set(rows.map((row) => row.name_ko)).size).toBe(rows.length);
    for (const row of rows) {
      expect(typeof row.name_ko).toBe('string');
      expect((row.name_ko as string).trim()).not.toBe('');
      expect(typeof row.name_en).toBe('string');
      for (const field of ['moisture', 'protein', 'fat', 'ash', 'fiber']) {
        expect(typeof row[field]).toBe('number');
      }
    }
  });
});
