# Saved label item review and matching

This unit adds explicit review of **saved current-label items**, separate from the
existing general ingredients editor and from whole-label comparison approval.
No consumer scoring, nutrition, risk or allergy rules change. PR #122 remains a
separate Draft with a real-package pilot prerequisite.

## Administrator flow

Use the existing administrator login and product label review section. Load the
saved whole-label snapshot, then load the label item workspace. Read the original
label and select a stable item ID; repeated or compound labels remain separate.
Search the existing canonical/legacy ingredient dictionary (including canonical
aliases), inspect candidates, and explicitly choose a mapping or hold with a
reason. Search results are not approval and nothing is automatically selected.
The before/after preview preserves raw text, order, percentage and amount.

A hold removes mapping, keeps the item **unreviewed**, and retains its reason in
private history. Unsaved choices/reasons are labeled and reset on reloading or
changing item/product; requests from the previous product cannot populate the
next product review. It is not an instruction to ignore the label item. Raw edits,
item addition/deletion and package identity correction are separate explicit
registration work; this screen and RPC reject those fields. Missing source items
must be fixed in that separate workflow before whole comparison is possible.

After each decision, all whole-label confirmations reset. A reviewer must check
the source/package identity, each item and the entire original anew before using
the existing whole-label approval. Neither matched count nor a client completion
flag certifies coverage. Hashes protect snapshot consistency, not the truth of a
human interpretation or the completeness of the original transcription.

## Server and database boundary

Three additive admin-write actions reuse existing administrator authentication.
The router supplies the actor. Inputs are allowlisted; actor, completion claims,
raw source changes and arbitrary target fields are rejected. Only service_role
can execute the three database RPCs; anon/authenticated cannot read private
review reasons or execute these RPCs. No new public response fields are added.

Each decision locks products, label sets, items, canonical and legacy dictionary
in the existing whole-approval order with a three-second lock timeout. These are
**coarse table locks**, not per-product throughput guarantees. Ordinary source
DML participates through PostgreSQL table locks. The server reads the current
snapshot only after obtaining the locks, compares its revision and checks that
the item belongs to the sole current label. Candidate hashes bind the currently
selected dictionary definition, including resolved risk/status. The selected candidate shows dictionary
description and English name; these are not package-identification evidence.
The current legacy ingredients schema has no active/retired flag; canonical
draft/retired or deleted targets and missing resolved legacy rows are rejected.
Draft canonical
or unresolved dictionary entries cannot be selected. Review reasons are private.

Mapping update, foundation revision invalidation, immutable decision and existing
admin audit insert are a single RPC transaction. Audit failure rolls everything
back. No cascading FK is attached to history. Raw/order/amount are unchanged.
Any mapping or reason change invalidates existing whole-label evidence, including
ABA generations. The existing public receipt recomputes validity; old approval
history is preserved rather than deleted.

Retry guarantee: **state-based unchanged detection with a current revision**.
An unchanged mapping and reason adds no audit; the old successful request's
revision conflicts. This is not permanent request deduplication. On a timeout,
conflict or uncertain result, no automatic retry is made: reload workspace and
inspect history before another decision. Approval is disabled during an item
mutation and after an uncertain mutation until fresh review.

## Unapplied deployment dependency

`supabase/migrations/20261112140000_admin_label_item_matching.sql` is now a
formal forward migration candidate. **It is not operating-applied or approved.**
Do not run repository-wide push: seven unrelated unapplied migrations remain.
Use only the independently verified release bundle containing exact remote
ledger renders plus this one candidate, without repair or include-all. Existing applied
foundation/sequence/review migrations are unchanged. Future release order requires
separate approval: recheck current schema, ledger, completed backup and
one-candidate linked dry-run -> apply database -> deploy only matching-compatible admin-write -> release
administrator UI -> real package review pilot. Deploying UI first cannot approve
without the RPC, and shows lookup failure instead of treating it as no label.
No backfill, automatic matching or old-ready promotion is included.

## Validation and limits

Synthetic service tests execute actual auth, router, validation and SQL, replacing
Deno/SDK transport and the minimal schema. They cover match/hold/whole approval,
public receipt, permissions, omitted source item, conflicts, candidate changes,
duplicate/compound labels and audit rollback. Actual PostgreSQL two-session tests
and official CLI cover concurrent writers/approval/source changes, lock timeout
and migration-ledger failure. Full-schema bootstrap uses the existing legacy
guards; this is not original historical replay or operating Supabase HTTP.
React tests and 390/1280 Chromium fixtures use synthetic transport, not operating
authentication or real iOS. Fixture servers bind loopback and close in finally;
artifacts contain only synthetic text. The held consumer is applied only in a
disposable pinned integration checkout; it is never pushed with this PR.

## Real package pilot inputs (no purchase required)

Any feed package the user already owns is eligible; there is no technical
restriction to the previously investigated two products. Provide a readable front
(product/brand/line, flavour, life stage, size), the **entire ingredients and
additives panels**, nutrition/guaranteed analysis, feeding/use cautions, barcode,
manufacturer/importer, and lot/date or package revision where present. Photograph
all relevant sides without cropping or personal/shipping labels. Close-ups may
supplement a full-panel shot. Multiple bags/boxes or multipacks require exact
individual weight and count/option confirmation.

A candidate links to an existing DB UUID only when species, product/line/flavour,
life stage, weight/count and package version correspond; a shared sales URL or
similar name is insufficient. If no exact DB row exists, use the normal explicit
registration review separately. If original transcription or dictionary mapping
is missing/ambiguous, record the precise blocker and hold; do not invent a match.
No operating product, label, matching or evidence write is part of this PR work.


## Receiving photographs and execution stops

1. Privately identify species, brand/line, flavour, life stage, exact weight/count
   and package/lot version against one existing product UUID. Record both the
   observed identity and any gap. A manufacturer webpage can identify an online
   version but does not establish equivalence to a later physical package.
2. Compare the **entire** source panel to the saved current label and its stable
   ordered items. No cropping, inferred token or count-only completeness claim.
   This PR does not add a raw-label registration/replacement/add/delete action;
   the ordinary ingredients editor edits legacy links only. If original/items
   are missing or differ, stop at a separately reviewed explicit source
   registration/import with its own audit/deployment authorization. Do not use
   this matching RPC or direct SQL/RPC as a replacement registration tool.
3. With corresponding saved source, use normal authenticated admin search to
   review each item; explicitly map or hold with a reason. Preserve repeated
   and compound items. A hold cannot pass whole approval.
4. Reload the new revision, compare every item and package source anew, and
   explicitly approve whole-label evidence through the existing admin action.
5. Privately compare product/source preservation, decision/audit and approval
   receipt, then use the sanitized public reader. A real pilot and coverage/
   withheld-cohort decision are still required before PR #122 may launch.

Current real-pilot status remains unqualified: the two previously investigated
Royal Canin examples lack exact package size/barcode/revision correspondence.
Their manufacturer source is not new physical-package evidence. Repeating the
same search is not a remedy. Any owned package with the complete photos above
may instead qualify; no purchase or new product is requested.
