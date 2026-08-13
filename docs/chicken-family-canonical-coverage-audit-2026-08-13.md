# Chicken-Family Canonical Coverage Audit — 2026-08-13

## Purpose

This audit returns to the original reason for the alias/canonical work: ingredient labels are inconsistent across products.

Examples:

- 닭
- 닭고기
- 닭가슴살
- 닭정육
- 닭고기분말
- 닭고기 분말
- 계육분
- 계육 분말
- 치킨밀
- chicken
- chicken meal

The goal is not to show a cosmetic alias badge to users. The goal is to make ingredient analysis use a stable meaning layer.

## Current Finding

The current local ingredient dictionary already separates two important chicken-family concepts:

| dictionary id | canonical | category | source |
|---|---|---|---|
| `chicken` | 닭고기 | `animal_protein` | `chicken` |
| `chicken_meal` | 계육분 | `processed_protein` | `chicken` |

This is the right direction. Fresh chicken and chicken meal should share source/allergen family, but they should not collapse into one canonical ingredient.

## Covered Today

The current dictionary covers these fresh chicken variants as `chicken`:

- 닭
- 닭고기
- 닭가슴살
- 닭 신선육
- 닭신선육
- 생닭고기
- 치킨
- chicken

The current dictionary covers these processed chicken variants as `chicken_meal`:

- 계육분
- 계육 분말
- 닭고기분
- 닭고기분말
- 닭고기 분말
- 치킨밀
- chicken meal

## Current Gap

The current dictionary does not cover:

- 닭정육
- 닭 정육

These should be candidate aliases for `chicken`, not for `chicken_meal`.

## Important Boundary

This audit does not change scoring, UI, runtime behavior, database rows, or product labels.

It only documents current coverage and locks the current known gap with a test.

## Next Step

The next safe step is a chicken-family alias candidate fixture that proposes:

1. additional fresh chicken aliases for `chicken`
2. additional processed chicken aliases for `chicken_meal`
3. review-only adjacent terms that must not be silently collapsed into either bucket

The candidate fixture should still be non-runtime and app-invisible.
