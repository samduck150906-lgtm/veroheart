# Production read-only physical column map — 2026-08-23

## Why this exists

The existing read-only harness uses logical TypeScript adapter fields such as `productId`, `nameKo`, and `riskLevel`. The production Supabase schema uses snake_case physical columns such as `product_id`, `name_ko`, and `risk_level`.

This document freezes the boundary so a future read-only export does not accidentally query camelCase field names from Supabase.

## Physical tables used for the export boundary

| Physical table | Physical column | Adapter field | Required |
| --- | --- | --- | --- |
| `products` | `id` | `id` | yes |
| `products` | `name` | `name` | yes |
| `products` | `main_category` | `category` | no |
| `products` | `target_pet_type` | `targetPetType` | no |
| `product_ingredients` | `product_id` | `productId` | yes |
| `product_ingredients` | `ingredient_id` | `ingredientId` | yes |
| `product_ingredients` | `sort_order` | `position` | yes |
| `ingredients` | `id` | `id` | yes |
| `ingredients` | `name_ko` | `nameKo` | yes |
| `ingredients` | `name_en` | `nameEn` | no |
| `ingredients` | `risk_level` | `riskLevel` | no |

The physical names above are grounded in the repository Supabase schema and the existing admin read paths.

## `computed_signals` is not a production table

`computed_signals` is a harness dataset, not a physical Supabase relation in this contract. Allergy hits, caution classes, personalized score, display score, and ranking position are derived from read-only product/ingredient rows by the current runtime analysis functions.

This distinction matters because creating a fake `computed_signals` SQL query would either fail or encourage persistence of derived policy output as if it were source data.

## Safety boundary

This change does not contain executable SQL, does not import the Supabase client, does not read production by itself, and does not write or mutate any row. It also does not authorize migrations, environment changes, deployment changes, feature-flag changes, or app runtime wiring.

The next safe step is to build a SELECT-only export specification using these physical columns and then feed exported rows through the existing adapter and policy-impact harness. Actual production execution remains a separate operational action.
