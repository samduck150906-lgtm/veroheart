# Sampled Report Packet Fixture — 2026-08-20

## Purpose

This fixture combines the safe, non-runtime evidence flow built across the previous harness PRs.

It packages:

1. SELECT shape/template guard evidence
2. production-shaped fixture rows
3. row adapter output
4. before/after impact diff
5. shared harness gate decision

No live database access is performed.

No SQL is executed.

No app runtime behavior is changed.

## Packet Flow

```text
structured select shapes
→ fixture selected rows
→ read-only row adapter
→ impact dry-run
→ harness gate
→ sampled evidence packet
```

## Fixture Meaning

The sample includes three products:

| product | ingredient signal | expected report behavior |
|---|---|---|
| chicken meal sample | 계육분, 닭지방 | allergy, score, display, and ranking impact |
| unknown byproduct sample | 동물성부산물 | no named-source allergy impact |
| fish oil sample | 연어오일 | fish-family allergy, score, display, and ranking impact |

This keeps the original semantic boundary:

- named source family rows can be allergy-impacting
- unknown animal byproduct is not promoted into a named animal source
- score/display/ranking impact is reported, not silently approved
- behavior-impacting evidence routes to approval_required

## Safety Boundary

This fixture is helper/test/docs only.

It does not:

- execute SQL
- connect to Supabase
- mutate production rows
- change score logic
- change UI
- enable runtime flags
- change env, secrets, URLs, tokens, or deploy settings

## Next Step

The next safe step is to add a combined report packet schema for real read-only evidence artifacts.

Actual production read execution remains outside this fixture and should be separately reviewed before use.
