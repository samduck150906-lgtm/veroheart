# Phase 2 Alias Resolver Shadow Review Packet — 2026-08-11

## Purpose

This document combines the non-visible Phase 2 alias resolver shadow metadata, result envelope, report builder, and invariance proof into one review packet.

This packet is still not an app-visible behavior change. It does not enable runtime output changes, does not change scores, and does not approve canonical alias scoring.

## Packet Sources

| source | role |
|---|---|
| `docs/phase2-alias-resolver-shadow-metadata-shape-2026-08-11.md` | sidecar row shape |
| `docs/phase2-alias-resolver-shadow-result-envelope-2026-08-11.md` | product-level result envelope |
| `docs/phase2-alias-resolver-shadow-report-builder-2026-08-11.md` | multi-product report summary |
| `docs/phase2-alias-resolver-shadow-invariance-2026-08-11.md` | score/display/ranking invariance proof |

## Scope

Allowed:

- combine existing shadow-mode artifacts into one review packet
- keep the packet non-visible and internal
- keep score impact, runtime mutation, visible label replacement, and changed product counters at zero
- keep app-visible output unchanged

Not allowed:

- enabling the runtime feature flag
- changing score calculations
- changing app-visible scores, labels, cards, detail pages, analysis text, warnings, badges, or ranking
- mutating product ingredients
- replacing raw labels with canonical aliases
- using canonical aliases as safety decisions
- adding Supabase reads/writes
- adding or modifying SQL files
- adding or modifying migrations
- changing `.env`, secrets, credentials, URLs, or tokens
- creating product label rows

## Combined Shadow Packet Requirements

A future shadow-mode or behavior-changing PR must be able to provide all of these sections:

1. Executive summary
2. Runtime visibility claim
3. Shadow metadata row summary
4. Shadow result envelope summary
5. Shadow report summary
6. Score invariance proof
7. Display verdict invariance proof
8. Ranking invariance proof
9. Raw label preservation proof
10. Mutation guard proof
11. Score impact guard proof
12. Visible label replacement guard proof
13. Blocked fallback review
14. Ambiguous fallback review
15. Unmatched fallback review
16. Disable strategy
17. Rollback strategy
18. Exact owner approval text for any app-visible change

## Fixed Shadow Review Summary

Current non-visible fixture expectations:

| metric | value |
|---|---:|
| score impact allowed rows | 0 |
| runtime mutation allowed rows | 0 |
| visible label replacement allowed rows | 0 |
| changed products | 0 |
| score changed | 0 |
| display verdict changed | 0 |
| ranking changed | 0 |
| raw labels replaced | 0 |

## App-Visible Change Gate

This packet still requires owner approval before any change that affects:

- product card score
- product card badge or pet-type/tag presentation
- product card ranking/sorting order
- detail-page score or grade
- analysis report text
- warning text
- raw ingredient labels shown to users
- recommendation reasons shown to users

## Not Approved By This PR

This PR does not approve:

- app-visible output changes
- runtime flag enablement
- canonical alias scoring
- score calculation changes
- Supabase production operations
- migrations
- product label row creation

## Next Step

The next non-visible step can add a shadow-mode execution wrapper that builds these internal reports while keeping app-visible output unchanged. If any wrapper becomes user-visible or deploy-config-driven, it must stop for owner approval.
