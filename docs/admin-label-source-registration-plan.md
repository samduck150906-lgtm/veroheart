# Explicit raw label registration and replacement

## Implemented boundary

This administrator feature registers a new current raw ingredient/additive label and explicit ordered items. It does not edit nutrition, legacy product ingredients, canonical definitions, matching rules, scores, or risk/allergy rules. Existing `ProductLabelPasteBox`, `saveProductSource`, and scan observation merging are not substitute registration routes.

The normal authenticated `admin-write` router supplies actor. `getLabelSourceWorkspace` reads the current snapshot and private source registration metadata. `registerIngredientLabelSource` accepts the exact product, expected current label ID (null for first registration), server-issued snapshot revision, raw text, source type/reference, actual observation time with zone, exact flavour/weight/pack identity notes, reason, explicit ordered items with ingredient/additive/unresolved section, and draft/held disposition. No client canonical ID, reviewed flag, completed flag, actor, or approval hash is accepted.

The existing bracket-aware parser proposes editable items only. Raw Unicode and line breaks remain unchanged; repeats and compound ingredients remain separate ordered observations. Divergent segmentation, unmatched brackets, unresolved items or recognizable nutrition/caution sections require an explicit held draft and reason. They cannot be whole-label approved. Parser agreement is not evidence of truth, complete transcription or exact package identity; the existing explicit human whole-label review is still required. Headers/compound representations the parser cannot represent remain held rather than silently rewritten.

## Storage, concurrency and access

Migration `20261116090000_admin_label_source_registration.sql` is a forward candidate requiring #123/#125/#126. It adds a private UUID registration-history table (no sequence), two service-only RPCs and forward replacements of the existing private snapshot/structural-validity functions. Existing migrations are unchanged. For labels without new registration history the snapshot JSON is byte-semantically unchanged; no historic proof backfill or blanket invalidation is performed.

Registration locks products → label sets → items → canonical → legacy ingredients in the same table order as matching/approval, with a three-second lock timeout. All ordinary writes to these tables participate through PostgreSQL table locks and existing revision triggers, not just the new UI. Under lock the server checks current label identity and whole snapshot revision, retains the previous label and its items/mappings/evidence, inserts a new current label, inserts server-held unreviewed items, records private source history and existing admin audit in one call. Existing unique partial index `idx_product_ingredient_label_sets_one_current` enforces one current label. New private holds prevent the existing automatic matcher from inheriting mappings during insertion. There is no new auto matching/backfill.

Only the existing normal admin gateway can use the RPCs via service-role transport. Direct application table/RPC access is denied. Effective permissions under Supabase defaults and inherited grants are tested. Private source reference, option notes and actor stay private; the public label uses an opaque `registration:UUID` reference. Signed/credential-bearing URL references are rejected by the gateway; package photograph references can use `package:local-photo-id`. No URL is fetched. Existing public receipt stays minimal and contains no private snapshot, registration source or actor.

Held status participates in the snapshot and prevents approval even after individual matches. Resolving a held raw source is a new explicit replacement revision, never a date-only update. Old comparisons become stale through existing snapshot/generation rules. A successful old request replay conflicts on its old revision; identical content at a freshly queried revision is a state-based no-op. This is not permanent request-ID deduplication.

## Administrator workflow

Use the separate “원문 라벨 등록·교체” section in the existing saved-product label review screen. Query current data; provide the complete raw ingredient/additive area, exact source/observation/option identity, inspect proposed items and manually correct sections/add/remove items; hold unresolved material. Review before/after raw text and ordered items before saving. Save creates only unreviewed material. Then use existing individual matching/hold, whole-label source comparison, explicit evidence approval, and public receipt query. Each is a separate action.

Unknown response, timeout, conflict or failure blocks reposting until current source and audit are re-read; current source workspace includes the registration audit receipt. No automatic mutation retry. Product navigation remounts the keyed form; drafts and selections are not transferred to another product. Unsaved edits require confirmation before destructive requery. No operating mutation is part of synthetic tests.

## Deployment gate

Approval is still required: verified remote-history-only bundle + this candidate → DB postchecks → exact reviewed `admin-write` source → unauthenticated/malformed-token denials and normal admin verify → administrator hosting release. The consumer #122 is separate, Draft and not released here. DB-first is required; new UI with missing RPCs shows unavailable rather than absent-source or successful save. No operating writes or migration application are authorized by this document.

DB postchecks: candidate ledger once; expected table/RPC signatures and ACL; no extra sequence; old product/label/item/source/comparison/audit fingerprints unchanged before pilot; old snapshot hashes unchanged; public receipt excludes private fields. Lock/ledger/audit errors stop progression. Unknown CLI outcome requires actual ledger/object inspection before retry. No automatic rollback or policy deletion.

The CLI test applies the same single-DO migration with normal CLI2.118.0 (no external BEGIN), tests ledger failure rollback, then runtime two-session conflicts and audit failure. Full repository validation is **guarded bootstrap**, not raw historical replay or Supabase HTTP. Synthetic gateway tests execute real authentication/router/parser/RPC SQL with only transport/minimum schema substituted. UI transport tests and #122 temporary integration are synthetic and not operating pilot proof.

## Pilot input, independent of development

Use one package already owned; no purchase required. Obtain front/product/options and net weight/pack count; complete ingredient and additive panels without cropped lines; separate nutrition/cautions; manufacturer/importer/barcode; lot and visible dates. Provide all sides needed to connect panels to the same package. Preserve original photos privately; OCR is an editable draft. Compare existing DB name/brand/flavour/life stage/weight/count/barcode when available, never infer an unprinted revision or invent an ingredient match. Missing identity/label areas hold only the pilot, not development. No registration, matching or evidence approval occurs without separate operating authorization.
