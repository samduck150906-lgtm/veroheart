# Animal-Family Canonical Coverage Audit — 2026-08-16

## Purpose

This audit broadens the chicken-family work to other animal ingredients.

The original problem was not UI display. The problem was inconsistent ingredient naming:

- one animal source can appear under many labels
- one source can appear as fresh meat, meal, fat, organ, cartilage, byproduct, or generic animal protein
- those labels should not all collapse into one ingredient concept

## Current Dictionary Coverage

The local dictionary currently has named animal protein entries for:

| id | canonical | category | source family |
|---|---|---|---|
| `chicken` | 닭고기 | `animal_protein` | `chicken` |
| `chicken_meal` | 계육분 | `processed_protein` | `chicken` |
| `beef` | 소고기 | `animal_protein` | `beef` |
| `pork` | 돼지고기 | `animal_protein` | `pork` |
| `duck` | 오리고기 | `animal_protein` | `duck` |
| `lamb` | 양고기 | `animal_protein` | `lamb` |
| `turkey` | 칠면조 | `animal_protein` | `turkey` |
| `salmon` | 연어 | `animal_protein` | `salmon` |
| `tuna` | 참치 | `animal_protein` | `fish` |
| `whitefish` | 흰살생선 | `animal_protein` | `fish` |
| `egg` | 계란 | `animal_protein` | `egg` |

## Current Gap

Chicken currently has both:

- fresh named meat: `chicken`
- processed named meal: `chicken_meal`

Most other animal families currently do not have separate named meal canonicals such as beef meal, pork meal, duck meal, salmon meal, or turkey meal.

That does not mean they should all be added immediately. It means future alias work must distinguish:

1. exact canonical identity
2. source family
3. allergen family
4. ingredient form or part
5. scoring readiness

## Byproduct Boundary

The dictionary already separates generic animal byproduct from named animal proteins:

- canonical: `animal_byproduct`
- category: `processed_protein`
- source family: `unknown`
- default severity: `watch`

This is correct. Generic or unclear animal material should not silently become a named safe meat source.

## Not Approved

This audit does not approve:

- new alias rows
- dictionary mutation
- scoring changes
- allergy score changes
- UI changes
- runtime flag enablement
- Supabase writes
- SQL or migration changes
- env/secrets/deploy changes

## Next Step

The next safe step is a source/part/allergen separation contract.

That contract should explicitly prevent these mistakes:

- treating fresh meat and meal as the same canonical ingredient
- treating fat, liver, organ, cartilage, or byproduct as ordinary meat
- treating source family as the same thing as canonical identity
- changing allergy or score behavior before a diff report exists
