# Production read-only physical schema bridge

This document connects the logical read-only report contract to the actual Supabase column names used by the repository.

## Physical production tables

Only these tables are treated as physical read sources for the current impact-report pipeline:

- `products`
  - `id` → `id`
  - `name` → `name`
  - `product_type` → `category`
  - `target_pet_type` → `targetPetType`
- `product_ingredients`
  - `product_id` → `productId`
  - `ingredient_id` → `ingredientId`
  - `sort_order` → `position`
- `ingredients`
  - `id` → `id`
  - `name_ko` → `nameKo`
  - `name_en` → `nameEn`
  - `risk_level` → `riskLevel`

These names are grounded in the current repository schema and the app's Supabase row mapping.

## `computed_signals` is derived, not a table

`computed_signals` in the earlier harness contract is a logical dataset only. It is not a production Supabase table and must not be translated into a production SELECT.

The fields `allergyHits`, `score`, `displayScore`, and `rankingPosition` are produced after physical rows are mapped into app/harness data and the current runtime policy is evaluated locally.

Therefore the production-shaped flow is:

`physical SELECT-shaped rows` → `snake_case to adapter mapping` → `Product/ingredient snapshot` → `current matcher/scoring` → `computed signals` → `impact packet`

## Safety boundary

This bridge contains no executable SQL and no Supabase client call. It does not authorize production access. It cannot insert, update, delete, migrate, deploy, change env values, or mutate product data.

A future real production read must remain SELECT-only and should be reviewed against this map before any query is executed.
