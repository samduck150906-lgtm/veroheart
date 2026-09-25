# Community Scan Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn an unknown barcode into a recoverable three-photo submission and, after user confirmation and minimum validation, a public deduplicated community product.

**Architecture:** The browser captures and re-encodes images, then uploads them directly to a private Supabase Storage path authorized by short-lived signed upload tokens. Netlify Functions verify the user's Supabase JWT, own service-role mutations, call Open Pet Food Facts, and run schema-constrained image extraction through Netlify AI Gateway. Publication is an idempotent server operation separated from analysis.

**Tech Stack:** React 19, TypeScript, Supabase Auth/Postgres/Storage, Netlify Functions, Netlify AI Gateway, Google GenAI SDK with `gemini-2.5-flash`, Vitest

**Spec:** `docs/superpowers/specs/2026-09-25-community-product-scan-catalog-design.md`

## Global Constraints

- Existing barcode lookup remains available without login.
- Creating a public product requires an authenticated user.
- Require front, ingredient, and nutrition/registration photo categories; allow additional panels.
- Upload images directly to private storage; never send image bytes through a Netlify function.
- OCR extracts label facts only and cannot assign risk, allergy, or score.
- A public community product remains `pending` and displays `사용자 스캔 · 검증 전`.
- Every retry is idempotent on submission ID.
- Never expose service-role, AI Gateway credentials, contributor ID, or private object path.

## Review Focus

- iOS without `BarcodeDetector` can still enter a barcode and start capture; Task 7 tests this.
- A user cannot upload into or read another user's submission path; Task 1 tests RLS and Task 3 tests signed-path validation.
- Retried background invocations cannot create two extraction records or products; Tasks 5 and 6 test idempotency.
- Printed barcode disagreement blocks publication rather than choosing one silently; Tasks 5 and 6 test this.
- A supplement without a conventional guaranteed-analysis table can pass with a confirmed registration/active-component panel; Task 6 tests the product-type-specific gate.

---

### Task 1: Add private scan submission, observation, and storage schema

**Files:**
- Create: `supabase/migrations/20260925120000_community_scan_submissions.sql`
- Create: `src/lib/communityScanMigration.test.ts`

**Interfaces:**
- Consumes: authenticated `auth.uid()` and existing `products`.
- Produces: `product_scan_submissions`, a scan link on the existing immutable `product_observations`, private `product-scan-evidence` bucket, service-only processing events/rate buckets, RLS, and enum-like checks.

- [ ] **Step 1: Write failing migration-contract tests**

Assert the migration creates submission, processing-event, and expiring rate-bucket tables; additively links the catalog plan's `product_observations` to a submission; constrains submission states to `draft`, `uploaded`, `processing`, `needs_confirmation`, `submitted`, `published`, `needs_review`, `failed`, `cancelled`, or `rejected`; stores three JSON image-path arrays/fields; stores extraction version/output; enables RLS; allows users to select/update only their own pre-publication rows; denies client access to observations/events/rate buckets; and creates no public storage policy.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/lib/communityScanMigration.test.ts`  
Expected: FAIL because the migration is absent.

- [ ] **Step 3: Implement the additive migration**

Use UUID primary keys and these server-owned uniqueness rules:

```sql
CREATE UNIQUE INDEX product_scan_submissions_processing_key
  ON public.product_scan_submissions (id, user_id);

CREATE UNIQUE INDEX product_observations_submission_source_key
  ON public.product_observations (scan_submission_id, source_type)
  WHERE scan_submission_id IS NOT NULL;
```

Store `front_image_paths text[]`, `ingredient_image_paths text[]`, and `nutrition_image_paths text[]`; `extracted_data jsonb`; `confirmed_data jsonb`; `field_confidence jsonb`; `processing_error_code text`; and `resolved_product_id uuid`. Create an `updated_at` trigger. Bucket objects must follow `<user-id>/<submission-id>/<category>/<uuid>.webp`.

Add `scan_processing_events` with submission ID, event name, duration, safe error code, created time, and no raw token/IP. Raw IP rate-limit keys are never stored.

Add `scan_rate_limit_buckets` with HMAC digest, scope, window start, count, and expiry. Revoke all client access and index expiry for scheduled cleanup.

- [ ] **Step 4: Run migration tests and verify GREEN**

Run: `npx vitest run src/lib/communityScanMigration.test.ts src/lib/securityMigration.test.ts`  
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260925120000_community_scan_submissions.sql src/lib/communityScanMigration.test.ts
git commit -m "feat: add private scan submission schema"
```

### Task 2: Define barcode, scan-state, and publication-gate domain contracts

**Files:**
- Create: `src/scan/types.ts`
- Create: `src/scan/scanState.ts`
- Create: `src/scan/scanState.test.ts`
- Create: `src/scan/publicationGate.ts`
- Create: `src/scan/publicationGate.test.ts`

**Interfaces:**
- Consumes: normalized barcode from `src/lib/productIdentity.ts` and confirmed extraction fields.
- Produces: `ScanSubmission`, `ExtractedProductLabel`, `transitionScanState`, and `evaluatePublicationGate`.

- [ ] **Step 1: Write failing state-machine tests**

Assert `draft -> uploaded -> processing -> needs_confirmation -> submitted -> published` is valid; `failed -> uploaded` is valid for retry; `published -> processing` and `cancelled -> submitted` are invalid.

- [ ] **Step 2: Write failing publication-gate tests**

Use this result type:

```ts
export type PublicationGateResult =
  | { ok: true }
  | { ok: false; code: 'auth_required' | 'invalid_barcode' | 'missing_photo' | 'missing_identity' | 'missing_ingredients' | 'missing_registration' | 'barcode_conflict' | 'ambiguous_duplicate'; fields: string[] };
```

Test food, treat, and supplement cases separately. Assert three required categories, confirmed name/brand or manufacturer, species, product type, and product-specific label fields.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npx vitest run src/scan/scanState.test.ts src/scan/publicationGate.test.ts`  
Expected: FAIL because the modules are absent.

- [ ] **Step 4: Implement pure domain functions**

```ts
const ALLOWED: Record<ScanState, ScanState[]> = {
  draft: ['uploaded', 'cancelled'],
  uploaded: ['processing', 'cancelled'],
  processing: ['needs_confirmation', 'failed'],
  needs_confirmation: ['submitted', 'uploaded', 'cancelled'],
  submitted: ['published', 'needs_review', 'rejected'],
  published: [],
  needs_review: ['published', 'rejected'],
  failed: ['uploaded', 'cancelled'],
  cancelled: [],
  rejected: [],
};
```

Throw `InvalidScanTransitionError` for invalid transitions. The gate returns a stable error code and field list; it never mutates data.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npx vitest run src/scan/scanState.test.ts src/scan/publicationGate.test.ts src/lib/productIdentity.test.ts`  
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/scan/types.ts src/scan/scanState.ts src/scan/scanState.test.ts src/scan/publicationGate.ts src/scan/publicationGate.test.ts
git commit -m "feat: define community scan workflow"
```

### Task 3: Create authenticated submission and signed upload endpoints

**Files:**
- Create: `netlify/functions/_shared/supabaseServer.ts`
- Create: `netlify/functions/_shared/auth.ts`
- Create: `netlify/functions/_shared/http.ts`
- Create: `netlify/functions/scan-create.ts`
- Create: `netlify/functions/scan-upload-url.ts`
- Create: `netlify/functions/scan-status.ts`
- Create: `netlify/functions/scan-api.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `Authorization: Bearer <Supabase access token>`.
- Produces: `POST /api/scans`, `POST /api/scans/:id/upload-url`, and `GET /api/scans/:id`.

- [ ] **Step 1: Install function/AI runtime types and write failing endpoint tests**

Run: `npm install @google/genai && npm install -D @netlify/functions @netlify/edge-functions`.

Test missing token = 401; another user's submission = 404; invalid category/MIME/size = 400; disabled contribution kill switch = 503; the sixth user submission in one hour = 429; an abusive IP bucket = 429; signed path always begins with the authenticated user and submission IDs; status responses omit private paths and contributor ID.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run netlify/functions/scan-api.test.ts`  
Expected: FAIL because handlers are absent.

- [ ] **Step 3: Implement shared server auth**

Create a service client with `Netlify.env.get('SUPABASE_URL')` and `Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Extract the bearer token and call `client.auth.getUser(token)`. Return 401 on missing/invalid token and never log it.

- [ ] **Step 4: Implement endpoint handlers with modern Netlify syntax**

Each file uses a default `async (request, context)` export and an exact `Config.path`. `scan-create` validates/normalizes the optional barcode and inserts a `draft`. `scan-upload-url` verifies ownership, creates a UUID `.webp` object path, and calls `storage.from('product-scan-evidence').createSignedUploadUrl(path)`. `scan-status` returns state, safe error code, extraction fields, and resolved product ID only.

Before create/upload, read `app_settings.community_scan_enabled`; explicit false returns 503. Enforce five new submissions per user per rolling hour and twenty per HMAC-SHA256 IP bucket per hour. The HMAC uses server-only `SCAN_RATE_LIMIT_SECRET`; retain only the bucket digest and expiry, and purge expired buckets.

- [ ] **Step 5: Run endpoint tests and build**

Run: `npx vitest run netlify/functions/scan-api.test.ts`  
Run: `npm run build`  
Expected: tests and build pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json netlify/functions/_shared netlify/functions/scan-create.ts netlify/functions/scan-upload-url.ts netlify/functions/scan-status.ts netlify/functions/scan-api.test.ts
git commit -m "feat: add authenticated scan upload API"
```

### Task 4: Add safe browser image preparation and upload client

**Files:**
- Create: `src/scan/imagePrepare.ts`
- Create: `src/scan/imagePrepare.test.ts`
- Create: `src/scan/scanApi.ts`
- Create: `src/scan/scanApi.test.ts`

**Interfaces:**
- Consumes: camera/file `Blob`, Supabase session token, signed upload response.
- Produces: `prepareLabelImage(blob): Promise<Blob>` and typed scan API methods.

- [ ] **Step 1: Write failing image-policy tests**

Assert unsupported MIME is rejected; decoded dimensions below 900px on the longest edge are rejected; output is WebP/JPEG without source metadata; the longest edge is at most 2200px; and output is at most 4 MB or returns `image_too_large`.

- [ ] **Step 2: Write failing API client tests**

Mock `fetch`; assert bearer token use, signed upload uses `PUT` with the prepared blob, abort timeout maps to `network_timeout`, and a non-JSON server error does not leak response HTML into the UI.

- [ ] **Step 3: Run tests and verify RED**

Run: `npx vitest run src/scan/imagePrepare.test.ts src/scan/scanApi.test.ts`  
Expected: FAIL because modules are absent.

- [ ] **Step 4: Implement image preparation**

Decode with `createImageBitmap`, draw to a new canvas at bounded dimensions, and export WebP at 0.86 quality with JPEG fallback. Because the new canvas contains pixels only, source EXIF is not copied.

- [ ] **Step 5: Implement the typed client**

Expose `createScan`, `requestUploadUrl`, `uploadEvidence`, `submitImages`, `getScanStatus`, `confirmExtraction`, and `publishScan`. Every call obtains the current Supabase session and passes its access token; an absent session returns `auth_required` before network activity.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx vitest run src/scan/imagePrepare.test.ts src/scan/scanApi.test.ts`  
Expected: all tests pass.

```bash
git add src/scan/imagePrepare.ts src/scan/imagePrepare.test.ts src/scan/scanApi.ts src/scan/scanApi.test.ts
git commit -m "feat: add safe scan image uploads"
```

### Task 5: Add external lookup and schema-constrained extraction worker

**Files:**
- Create: `netlify/functions/_shared/openPetFoodFacts.ts`
- Create: `netlify/functions/_shared/openPetFoodFacts.test.ts`
- Create: `netlify/functions/_shared/extractionSchema.ts`
- Create: `netlify/functions/_shared/extractionSchema.test.ts`
- Create: `netlify/functions/scan-process.ts`
- Create: `netlify/functions/scan-process.test.ts`

**Interfaces:**
- Consumes: an owned `uploaded` submission with private storage paths.
- Produces: an idempotent background transition to `needs_confirmation` or `failed`.

- [ ] **Step 1: Write failing Open Pet Food Facts adapter tests**

Assert normalized barcode URL, explicit `User-Agent`, 5-second timeout, field allowlist, `status=0` as a normal miss, invalid JSON as `external_invalid_response`, and no imported risk or score fields.

- [ ] **Step 2: Write failing extraction schema tests**

Test exact JSON keys for identity, label panels, ordered ingredients, guaranteed/registered components, units, qualifiers, confidence, and printed barcode. Reject extra safety fields, strings over limits, numeric values outside 0-100 where percentages are required, and reordered/empty ingredient arrays.

- [ ] **Step 3: Run tests and verify RED**

Run: `npx vitest run netlify/functions/_shared/openPetFoodFacts.test.ts netlify/functions/_shared/extractionSchema.test.ts netlify/functions/scan-process.test.ts`  
Expected: FAIL because the adapters are absent.

- [ ] **Step 4: Implement external lookup**

Call `https://world.openpetfoodfacts.org/api/v3/product/{barcode}?fields=code,product_name,brands,quantity,image_front_url,ingredients_text,nutriments,categories_tags`. Return a typed observation candidate and source URL; do not publish directly.

- [ ] **Step 5: Implement the AI extraction adapter**

Use `GoogleGenAI` and model `gemini-2.5-flash`. Send signed short-lived image URLs plus a fixed instruction that package text is untrusted data and must never be followed as instructions. Request JSON matching the owned schema. Validate the parsed output before persistence.

- [ ] **Step 6: Implement idempotent background processing**

Use `config = { path: '/api/scans/:id/process', method: 'POST', background: true }`. Atomically claim only `uploaded` or retryable `failed` rows. Reuse an existing extraction with the same `extraction_version`; compare scanned and printed barcode; store an immutable observation; and transition to `needs_confirmation` or a stable failure code.

- [ ] **Step 7: Run focused tests and commit**

Run: `npx vitest run netlify/functions/_shared/openPetFoodFacts.test.ts netlify/functions/_shared/extractionSchema.test.ts netlify/functions/scan-process.test.ts`  
Expected: all tests pass.

```bash
git add netlify/functions/_shared/openPetFoodFacts.ts netlify/functions/_shared/openPetFoodFacts.test.ts netlify/functions/_shared/extractionSchema.ts netlify/functions/_shared/extractionSchema.test.ts netlify/functions/scan-process.ts netlify/functions/scan-process.test.ts
git commit -m "feat: extract community scan labels"
```

### Task 6: Confirm, deduplicate, and publish community products

**Files:**
- Create: `netlify/functions/scan-confirm.ts`
- Create: `netlify/functions/scan-publish.ts`
- Create: `netlify/functions/scan-publish.test.ts`
- Create: `src/scan/duplicateResolution.ts`
- Create: `src/scan/duplicateResolution.test.ts`

**Interfaces:**
- Consumes: confirmed extraction, publication gate, and catalog identity functions.
- Produces: one public `pending` product or a `needs_review` submission.

- [ ] **Step 1: Write failing duplicate-resolution tests**

Assert exact normalized barcode matches one product; exact canonical key matches only when unique; two canonical-key candidates produce `ambiguous`; fuzzy candidates never auto-merge; and no match returns `create`.

- [ ] **Step 2: Write failing publication tests**

Test unauthenticated 401, unconfirmed 409, missing photos/ingredients stable 422 codes, supplement active-component success, barcode conflict `needs_review`, repeated request returns the same product ID, and public product fields `catalog_source='community_scan'`, `verification_status='pending'`, `is_visible=true`.

- [ ] **Step 3: Run tests and verify RED**

Run: `npx vitest run src/scan/duplicateResolution.test.ts netlify/functions/scan-publish.test.ts`  
Expected: FAIL because handlers are absent.

- [ ] **Step 4: Implement confirmation**

Accept only editable label fields, trim and length-limit every string, preserve OCR output separately, and transition `needs_confirmation -> submitted`. A changed barcode is revalidated and recorded as a user correction.

- [ ] **Step 5: Implement publication transaction/RPC**

Create a SECURITY DEFINER RPC callable only by service role that locks the submission, re-evaluates identity, creates or links one product, inserts aliases/observation/ordered label items, updates the submission, and returns product ID. Unique barcode conflicts become `needs_review`; they are not retried as creates.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx vitest run src/scan/duplicateResolution.test.ts netlify/functions/scan-publish.test.ts src/scan/publicationGate.test.ts`  
Expected: all tests pass.

```bash
git add src/scan/duplicateResolution.ts src/scan/duplicateResolution.test.ts netlify/functions/scan-confirm.ts netlify/functions/scan-publish.ts netlify/functions/scan-publish.test.ts supabase/migrations/20260925130000_publish_community_scan.sql
git commit -m "feat: publish deduplicated community scans"
```

### Task 7: Build the three-photo scan and confirmation UI

**Files:**
- Modify: `src/pages/Scan.tsx`
- Create: `src/pages/Scan.test.tsx`
- Create: `src/pages/NewProductScan.tsx`
- Create: `src/pages/NewProductScan.test.tsx`
- Create: `src/components/scan/LabelPhotoStep.tsx`
- Create: `src/components/scan/ExtractionConfirmStep.tsx`
- Create: `src/components/scan/ScanProgress.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 4 client and Task 2 workflow types.
- Produces: unknown-barcode capture, three-photo upload, extraction polling, correction, publication, and final navigation.

- [ ] **Step 1: Write failing UI tests**

Test existing barcode navigation; unknown barcode navigation to `/scan/new`; manual barcode fallback when `BarcodeDetector` is absent; login prompt before contribution; required photo labels `제품 전면`, `원재료명`, `영양/등록성분`; retry after failure; editable extracted fields; and navigation to the resolved product after publish.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/pages/NewProductScan.test.tsx src/pages/Scan.test.tsx`  
Expected: FAIL because the page and route are absent.

- [ ] **Step 3: Change unknown-barcode behavior**

Replace search forwarding with `/scan/new?barcode=<normalized>` when lookup misses. Keep direct search as a secondary button. Add a numeric manual barcode input to the no-detector state.

- [ ] **Step 4: Implement the capture/upload flow**

Use one card per required category with capture/replace status, concise photo guidance, and no marketing copy. Prepare/upload each image immediately so page refresh can resume from the stored submission. Trigger background processing after all categories exist.

- [ ] **Step 5: Implement polling and confirmation**

Poll with exponential intervals capped at 8 seconds and stop on terminal/unmounted state. Render extracted values as editable fields, ordered ingredient chips/rows, and guaranteed components. Require explicit confirmation before publish.

- [ ] **Step 6: Run UI tests, full tests, lint, and build**

Run: `npx vitest run src/pages/NewProductScan.test.tsx src/pages/Scan.test.tsx`  
Run: `npm test -- --run`  
Run: `npm run lint`  
Run: `npm run build`  
Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Scan.tsx src/pages/NewProductScan.tsx src/pages/NewProductScan.test.tsx src/components/scan src/App.tsx
git commit -m "feat: add community product capture flow"
```

### Task 8: Add scan operations queues and final verification

**Files:**
- Create: `src/pages/admin/AdminScanSubmissions.tsx`
- Create: `src/pages/admin/AdminScanSubmissions.test.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`
- Modify: `src/App.tsx`
- Modify: `supabase/functions/admin-operations/index.ts`
- Create: `docs/community-scan-runbook.md`
- Create: `netlify/functions/purge-scan-evidence.ts`
- Create: `netlify/functions/purge-scan-evidence.test.ts`

**Interfaces:**
- Consumes: `needs_review`/`failed` submissions and immutable observations.
- Produces: read-only inspection, explicit merge/reject/retry actions with audit entries, and an operations runbook.

- [ ] **Step 1: Write failing admin tests**

Assert contributor email/identity and raw storage paths are not rendered; filters cover state/error/date; merge requires an exact target product ID and reason; reject/retry requires reason; and every mutation refreshes the row from the server.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run src/pages/admin/AdminScanSubmissions.test.tsx`  
Expected: FAIL because the page is absent.

- [ ] **Step 3: Implement admin read/actions**

Reuse the existing admin-token function boundary. Return signed evidence previews only on explicit row open. Write audit log action, actor, submission/product IDs, before/after status, and reason for every mutation.

- [ ] **Step 4: Write the runbook**

Document AI Gateway enablement, required server environment variables, storage retention, rate-limit thresholds, retry/error codes, queue handling, and the kill switch that disables new submissions without hiding existing products.

- [ ] **Step 5: Implement and test evidence retention**

Create a daily scheduled function that selects `published`, `rejected`, or `cancelled` submissions older than 30 days, deletes only their private storage objects, and clears the private path arrays after successful deletion. It preserves extracted text, confirmed data, product observations, selected public front image, and audit history. Test partial delete failure leaves paths retryable and another user's/recent/active objects untouched.

Run: `npx vitest run netlify/functions/purge-scan-evidence.test.ts`  
Expected: all retention tests pass.

- [ ] **Step 6: Run full verification**

Run: `npm test -- --run`  
Run: `npm run lint`  
Run: `npm run build`  
Run: `git diff --check`  
Expected: zero failures and exit 0 for every command.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminScanSubmissions.tsx src/pages/admin/AdminScanSubmissions.test.tsx src/pages/admin/AdminLayout.tsx src/App.tsx supabase/functions/admin-operations/index.ts docs/community-scan-runbook.md netlify/functions/purge-scan-evidence.ts netlify/functions/purge-scan-evidence.test.ts
git commit -m "feat: operate community scan review queue"
```
