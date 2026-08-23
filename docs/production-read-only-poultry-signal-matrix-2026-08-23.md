# Production read-only poultry signal matrix — 2026-08-23

## Purpose

This harness consumes the logical read-only rows produced by the production export path and evaluates the current repository allergy/scoring policy against four fixed synthetic allergy profiles:

- 닭
- 오리
- 칠면조
- 가금류

It is designed to answer “which existing products would be HARD, caution-only, or unaffected under the current policy?” without adding a second policy implementation.

## How products are reconstructed

The harness rebuilds the minimum `Product` shape from exported product/ingredient rows and calls the current repository matcher and scoring functions. Reviews, popularity, price, and other unrelated data are not introduced.

For cat-target products the synthetic profile is a cat; otherwise it is a dog. This avoids a species-mismatch zero from obscuring the poultry-allergy signal being audited.

## Missing-data rule

A missing or invalid physical `risk_level` is never converted into a scoreable safe ingredient.

The ingredient name can still be used to expose a HARD/caution identity relationship, but score, display score, allergy penalty, and ranking remain unavailable for that product/profile row until the risk data is valid. The report counts invalid risk rows, missing linked ingredients, and products with no ingredient links.

## Output

Each product × synthetic-profile row records:

- HARD hits,
- caution classes and ingredient names,
- current personalized score,
- display score,
- HARD allergy penalty,
- caution penalty,
- ranking position within that synthetic profile,
- whether the row was scoreable or data-incomplete.

Ranking is generated only for scoreable rows.

## Safety boundary

The harness is pure repository code. It does not execute SQL, import the Supabase client, mutate production data, alter the runtime policy, change app UI, enable a feature flag, or change deployment/environment configuration.

The next safe step is a before/after production-impact report that compares the frozen historical blanket-poultry baseline against these current-policy signals after a real read-only export is supplied.
