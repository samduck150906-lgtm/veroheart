# Explicit saved-label registration: pilot prerequisite

Status: design-only Draft. No executable migration, route, UI, source write or operating approval is introduced. This is separate from PR126 matching saved items and PR122 consuming whole-label proof.

## Confirmed boundary

- `src/pages/admin/ProductLabelPasteBox.tsx` parses text into the legacy ingredient/nutrition form. `AdminProducts.tsx` does not preserve that pasted text as a current label set or item list. It must not be used to repair missing full-label evidence.
- `admin-write` action `saveProductSource` stores `product_data_sources` provenance metadata. It does not replace `product_ingredient_label_sets` or `product_ingredient_label_items`. A source URL is not whole-label proof.
- `admin-operations` action `reviewScanSubmission` merge relinks scan observations; it is not an explicit revision-checked saved-label replacement flow.
- Existing service-only `ingest_product_ingredient_label` is a database primitive, not a normal administrator API with a current review revision and atomic administrator audit. Its request UUID is not proof of exact replay content. Do not expose or invoke it directly as a workaround.
- Matching/hold and whole-label review can process an already-saved exact label. Missing or changed raw text, item addition/deletion and packaging revisions need an explicit source-registration unit.

## Minimal next implementation

1. Reuse normal administrator authentication, existing product identity and `admin_get_label_comparison_review` snapshot. Read the saved snapshot before editing. Do not use service-role credentials in a client.
2. Provide a separate source operation in the existing review panel, distinct from product facts, legacy ingredients, item matching and whole-label approval. Show old/new raw text, ordered items, exact package/source reference and reason. A proposal is not saved until explicit confirmation.
3. Accept the complete raw transcription and an explicitly reviewed ordered item array. Do not infer completeness from counts or arbitrary comma splitting. Repeated names and compound ingredients remain separate where the package requires them. Do not accept client reviewed/ready/canonical-match/whole-proof flags.
4. Server allowlist, bounded strings/items, role checks and server-derived current snapshot revision are mandatory. Reject foreign product/item ownership, missing source, stale revision and multiple-current-label ambiguity. Revision includes current product, label, item and matching/generation facts.
5. Use one service-only database transaction for retaining the prior source, registering the replacement, advancing generation and administrator audit. Reuse the foundation and matching lock order: products -> label sets -> items -> canonical ingredients -> legacy ingredients. Bounded lock timeout; no pre-read-only concurrency solution.
6. Keep prior label and matching/evidence/audit history; mark prior label non-current, never cascade/delete it. The new source must not inherit human matching/whole-label approval. Existing automatic matches, if retained, must be labeled candidates and cannot certify the package. Existing consumer-without-proof behavior is a separate public-impact release gate.
7. Unknown result blocks retry until source/current revision/audit are re-read. A generated request ID is not permanent content-idempotency. A successful same-state repeat must not silently replace the source again; define the exact content and revision contract before implementation.
8. Public receipt stays minimal. Do not publish reviewer identity, source images/private raw documents, audit reasons or full internal snapshots. Product visibility and existing review policies remain unchanged.

## Required acceptance evidence

- Synthetic normal auth/router -> SQL -> current source -> match/hold -> explicit whole review -> public receipt; exact field and source preservation.
- New source alone does not create a comparison record; old proof cannot remain verified after replacement, including ABA changes. Matching names or item counts are not complete-label evidence.
- Stale revision, foreign product, malformed or completion-claim input and unauthorized requests leave source/audit unchanged.
- Audit failure rolls back source, generation and history; retain successful prior records.
- Real two-connection replacement vs matching/whole approval/ordinary source writers, both orders; lock timeout and official CLI migration-ledger atomicity.
- Supabase-style default/PUBLIC/inherited table/function/sequence ACL checks at creation time.
- UI 390/1280: old/new review, long/compound text, keyboard, unsaved edits, conflict, uncertain outcome, product switch and reload. No operating write test.

## Owned-package pilot input and release gates

No purchase or designated product is required. Use one owned package with exact species, brand, line, taste, life stage, weight and pack count. Photograph front; complete ingredients/additives; nutrition/feeding/cautions; manufacturer/importer; barcode when present; lot/date/revision. Exclude personal shipping labels. Absence of a barcode alone is not conclusive if other direct correspondence is sufficient.

Read exact DB product/option and current label first. If the package fully matches the saved label, use the saved-item review path after separate operating approval. If raw text/items/packaging revision differ, stop before matching or approval and implement/deploy the explicit source path above under a separate approval. Do not repair evidence through the legacy editor, direct SQL/RPC, arbitrary matching or product exposure changes.

Future SQL belongs in `supabase/migration_drafts` until separately reviewed. Deployment: DB and ACL checks -> administrator server -> normal-auth non-mutating compatibility -> administrator UI -> separately approved source pilot -> separately approved matching/whole proof -> consumer coverage/release decision. No backfill or readiness promotion. PR122 remains Draft/held.
