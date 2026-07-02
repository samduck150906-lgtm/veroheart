# Phase 1 Supabase Sandbox Runbook

> **SANDBOX ONLY. Never run these files in production project `nlutpmjloryqdomgbqrr` (`https://nlutpmjloryqdomgbqrr.supabase.co`).**

This runbook validates the additive Phase 1 schema in a brand-new, disposable Supabase project. It does not need a database password, access token, anon key, service-role key, CLI login, `.env` change, or GitHub Secret.

## Before you start

1. Open the target project in the Supabase Dashboard.
2. Open **Project Settings > General** and find **Reference ID**.
3. Also inspect the browser address and **Project Settings > API** project URL.
4. Stop immediately if either shows `nlutpmjloryqdomgbqrr` or `https://nlutpmjloryqdomgbqrr.supabase.co`.
5. Continue only when the project is newly created, disposable, and contains no application tables or data.

Use the SQL Editor in that disposable project. Paste file contents into a new query for each step; do not concatenate the files.

## Step 1: Create an empty temporary project

Create a separate Supabase project solely for this test. Do not link it to Netlify, GitHub Actions, the app, or the Supabase CLI.

**Expected:** The project opens successfully and its Reference ID is not `nlutpmjloryqdomgbqrr`.

**Stop if:** The Reference ID is the production ref, the project contains Veroheart data, or you cannot independently confirm which project is open.

## Step 2: Run the bootstrap

Run:

`supabase/tests/manual/phase1_sandbox_bootstrap.sql`

It creates only these minimal prerequisites and one obvious sentinel row in each:

- `public.products(id uuid primary key, name text)`
- `public.ingredients(id uuid primary key, name_ko text)`
- `public.allergens(id uuid primary key, code text unique)`

The script first confirms that the prerequisite and Phase 1 table names do not already exist. It also checks that `gen_random_uuid()` is available.

**Expected:** The query completes with no exception and three tables exist with one sentinel row each.

**Stop if:** Any table already exists, `gen_random_uuid()` is unavailable, or any statement fails. Do not weaken the guard checks.

## Step 3: Run the existing migration

Run the repository file unchanged:

`supabase/migrations/20260630090000_non_destructive_ingredient_schema.sql`

**Expected:** The transaction commits and 11 new, empty tables are created.

**Stop if:** PostgreSQL reports a missing relation/function, duplicate policy/constraint/index name, failed foreign key, or any other error. Do not edit the migration in the SQL Editor to make it pass.

## Step 4: Verify the migration

Run:

`supabase/tests/manual/phase1_sandbox_verify.sql`

The verifier raises an exception on the first mismatch. It checks:

- all 11 tables and RLS state;
- exactly 10 intended public SELECT policies and no review-queue policy;
- all 17 foreign keys;
- required primary/unique constraints and 13 named indexes;
- zero rows in every new table;
- unchanged prerequisite column shapes, UUID IDs, and sentinel rows.

**Expected:** A notice beginning `PASS: Phase 1 migration created 11 empty tables`.

**Stop if:** Any exception is raised. Keep the temporary project intact for inspection and do not proceed to production.

## Step 5: Roll back Phase 1

Run:

`supabase/tests/manual/phase1_sandbox_rollback.sql`

It drops only the 11 Phase 1 tables in reverse foreign-key order. It does not use `CASCADE` and does not drop the prerequisite tables.

**Expected:** A notice beginning `PASS: all 11 Phase 1 tables were removed`.

**Stop if:** An unexpected dependency blocks a drop, a Phase 1 table remains, or a sentinel/prerequisite table is missing or changed.

## Step 6: Confirm rollback

Rollback verification is built into `phase1_sandbox_rollback.sql` and runs before its transaction commits. In the Table Editor, confirm that `products`, `ingredients`, and `allergens` remain while the 11 Phase 1 tables are absent.

**Expected:** Three bootstrap tables remain, each with its single sentinel row.

**Stop if:** The SQL notice did not report PASS or the Table Editor differs from that result.

## Step 7: Optional migration rerun

To test repeatability after a clean rollback, run these files again in order:

1. `supabase/migrations/20260630090000_non_destructive_ingredient_schema.sql`
2. `supabase/tests/manual/phase1_sandbox_verify.sql`
3. `supabase/tests/manual/phase1_sandbox_rollback.sql`

Do not rerun the bootstrap because its prerequisite tables intentionally still exist.

**Expected:** Migration, verification, and rollback pass again.

**Stop if:** Any run differs from the first cycle.

## Step 8: Clean up or delete the project

After rollback has passed, either delete the temporary Supabase project or run:

`supabase/tests/manual/phase1_sandbox_cleanup.sql`

Cleanup refuses to run while a Phase 1 table exists or when sentinel contents differ. It then removes only the three bootstrap tables and sentinel rows.

**Expected:** A notice beginning `PASS: sandbox bootstrap tables and sentinels were removed`.

**Stop if:** A guard raises an exception. Project deletion is safer than bypassing a guard.

## Extension notes

The migration uses unqualified `gen_random_uuid()`. Current Supabase PostgreSQL provides this function in a new project (and PostgreSQL 13+ includes it as a core function). No extra extension statement is expected. The bootstrap checks function availability before creating anything, so an incompatible environment fails early rather than guessing an extension setup.

## What this sandbox proves

- SQL can create the 11 objects from a minimal compatible starting schema.
- UUID foreign keys target the intended tables and columns.
- Named policies, constraints, and indexes can be created in an otherwise empty project.
- The migration inserts no rows and leaves the sentinel prerequisite rows and table shapes untouched.
- The documented non-`CASCADE` rollback order is valid when no outside objects depend on Phase 1 tables.

## What this sandbox cannot prove

- Whether production migration history already contains an object with the same name.
- Whether the full production schemas of `products`, `ingredients`, or `allergens` interact with other constraints, triggers, policies, or dependencies.
- Whether production roles and grants match the intended security model beyond the RLS policy definitions.
- Migration runtime or lock impact with production-sized data and concurrent traffic.
- Whether production backups and restore procedures are ready.
- Whether deployed frontend or Edge Functions use the new tables; this test intentionally does not exercise runtime code.

A successful sandbox run is necessary evidence, not approval to run against production. Production application requires a separate human review, backup check, migration-history comparison, and deployment plan.
