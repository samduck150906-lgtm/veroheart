# Supabase migration ledger reconciliation

This repository snapshot reconciles the checked-in migration filenames with the
61 versions already recorded in the production migration ledger. It does not
apply, repair, or revert any production migration.

## Local-to-ledger mapping

| Removed local migration | Authoritative ledger migration(s) or disposition |
| --- | --- |
| `20260604235000_create_banners.sql` | `20260611142015_create_banners.sql` |
| `20260611140000_analysis_engine_data_load.sql` | `20260611142131_analysis_engine_data_load.sql` |
| `20260611150000_unmatched_ingredients_queue.sql` | `20260611142147_unmatched_ingredients_queue.sql` |
| `20260611160000_supplement_image_label_ingredients.sql` | `20260611151005_supplement_image_label_ingredients.sql` |
| `20260621000000_add_monetization.sql` | `20260621040102_add_monetization.sql` |
| `20260621000000_compatibility_score_schema.sql` | `20260621035856_compatibility_score_schema.sql` |
| `20260621120000_add_barcode_column.sql` | Schema is superseded by `20260702134231_add_barcode_to_products.sql`; its five fictitious development barcode updates are retired. |
| `20260621120000_create_community_posts.sql` | `20260621040027_create_community_posts.sql` |
| `20260621130000_create_community_comments.sql` | `20260621040653_create_community_comments.sql` |
| `20260621130000_seed_50_products.sql` | Retired demo seed. Its 50 synthetic products and barcodes do not identify production rows. |
| `20260621140000_community_tables.sql` | Split across `20260621040027`, `20260621040653`, and `20260621041820`. |
| `20260702000000_add_barcode_to_products.sql` | `20260702134231_add_barcode_to_products.sql` |
| `20260702120000_public_read_user_profiles.sql` | `20260702152508_public_read_user_profiles.sql` |
| `20260714120000_tighten_banner_and_queue_rls.sql` | `20260914144340_tighten_banner_and_queue_rls.sql` |
| `20260715000000_launch_waitlist.sql` | `20260914144348_launch_waitlist.sql` |
| `20260723120000_pet_feeding_logs.sql` | Split across `20260723131349` and `20260723131442`. |
| `20260728120000_feeding_log_photo_storage.sql` | `20260728104426_feeding_log_photo_storage.sql` |
| `20260728140000_admin_console_operations.sql` | Split across `20260728142725` and `20260728143352`. |
| `20260825120000_enforce_signup_enabled.sql` | Split across `20260825064411` and `20260825064534`. |
| `20260903120000_nutritional_profiles_allow_unknown.sql` | `20260903042750_nutritional_profiles_allow_unknown.sql` |
| `20260910120000_reconcile_auth_users_and_settings.sql` | `20260914144404_reconcile_auth_users_and_settings.sql` |
| `20260911090000_add_product_visibility.sql` | `20260914144413_add_product_visibility.sql` |
| `20260911100000_enrich_ingredient_nutrition_schema.sql` | `20260914144425_enrich_ingredient_nutrition_schema.sql` |
| `20260911102000_enrich_existing_ingredient_dictionary.sql` | `20260914144524_enrich_existing_ingredient_dictionary.sql` |
| `20260911110000_sync_product_review_aggregates.sql` | `20260914144655_sync_product_review_aggregates.sql` |
| `20260911111000_sync_product_risk_factors.sql` | `20260914144713_sync_product_risk_factors.sql` |
| `20260911112000_tighten_public_profiles_and_definers.sql` | `20260914144755_tighten_public_profiles_and_definers.sql` |
| `20260911113000_product_enrichment_workflow.sql` | `20260914144745_product_enrichment_workflow.sql` |
| `20260914090000_product_categories_and_pinning.sql` | Split across `20260914144953` and `20260914145039`. |
| `20260914100000_admin_trash.sql` | `20260914150105_admin_trash.sql` |
| `20260914110000_unique_nicknames.sql` | `20260914150249_unique_nicknames.sql` |
| `20260914120000_product_subcategories.sql` | Split across `20260914152647` and `20260914153416`. |
| `20260915090000_product_price_proposals.sql` | `20260915002845_product_price_proposals.sql` |
| `20260916090000_product_requests.sql` | `20260916061242_product_requests.sql` |
| `20260916100000_public_product_visibility_rls.sql` | `20260916064901_public_product_visibility_rls.sql` |
| `20260916110000_move_visibility_gate_to_private.sql` | `20260916065602_move_visibility_gate_out_of_api_schema.sql` |
| `20260922060000_rank_products_with_ingredients_first.sql` | `20260922053808_rank_products_with_ingredients_first.sql` |

The 43 ledger-only files are restored with their recorded version, name, and
statement order. The 18 files already common to both sides are unchanged. The
known historical `20250403120000` Petty/VeRoRo content difference is explicitly
out of scope for this filename reconciliation.

## Deliberately retained or deferred work

`20260630090000_non_destructive_ingredient_schema.sql` remains an active local
migration. A read-only object-by-object comparison found its schema effects in
production even though its version was absent from the ledger. On 2026-09-30
UTC, the version was recorded as applied with the following ledger-only repair:

```sh
supabase migration repair --linked --status applied 20260630090000
```

The repair did not execute this SQL or change schema or application data.
Migration history changed by exactly this one version, and read-only schema and
row-count fingerprints were identical before and after. Its manually approved
ledger-only rollback would be:

```sh
supabase migration repair --linked --status reverted 20260630090000
```

The 181-row standard-feed nutrition dataset is retained at
`supabase/reference-data/standard_feed_nutrition_reference.sql`. It was not
applied to production and must not run automatically. A separate nutrition-data
project must review it before promoting it through a new forward-only migration.

The authoritative ledger migration
`20260611151005_supplement_image_label_ingredients.sql` has a known legacy replay
dependency: on a completely empty database it references product rows that the
preceding ledger migrations do not create, so its foreign-key inserts fail. The
ledger SQL is preserved verbatim here. Empty-database replay should be solved by
a separate baseline or snapshot project, not by mutating production history.

This reconciliation is separate from PR #110. In particular,
`20260929230000_atomic_product_cleanup.sql` is intentionally absent.
