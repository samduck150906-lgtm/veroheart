# Family-Aware Allergy Diff Report Fixture — 2026-08-17

## Purpose

This fixture documents the expected score/display impact of source-family allergy matching before reviewing real production products.

## Fixture Inputs

The fixture uses a `닭` allergy profile and six products:

| product | label type | expected allergy hit |
|---|---|---:|
| ordinary chicken | direct named meat | yes |
| meal label | named meal / powder family | yes |
| organ label | organ family | yes |
| fat label | fat family | yes |
| poultry byproduct label | poultry family review | yes |
| unknown animal byproduct | unknown animal source | no |

## Expected Impact

The first five rows become allergy hits and receive the existing allergy penalty.

The unknown animal byproduct row remains out of named chicken matching because its source is not clear enough to treat as chicken.

## Boundary

This fixture proves allergy protection without collapsing canonical identity:

- organ is not ordinary meat
- fat is not ordinary meat
- poultry byproduct is not named chicken meat
- unknown animal byproduct is not named chicken

## Not Included

This PR does not include production DB queries or product data mutation.

A later production report can list real affected product IDs once we decide to run operational analysis.
