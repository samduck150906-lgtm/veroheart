# Health Concern Judgment Contract

This project separates product judgment into independent dimensions:

- pet/product suitability
- analysis confidence and data completeness
- product-information trust
- popularity
- value/price

Suitability score must not include reviews, popularity, price, sales volume, editorial promotion, verification status, or product trust grade. Confidence may affect recommendation eligibility, ordering tier, and wording, but it must not be hidden as a numeric suitability penalty.

## Canonical Profile Concerns

The single source of truth is `src/health/concerns.ts`.

| ID | Profile label | Required alias coverage |
| --- | --- | --- |
| `skin_coat` | 피부·모질 | 피부, 모질, 피모, skin, coat |
| `joint` | 관절 | 관절, joint |
| `digestive` | 소화기 | 소화기, 소화, 장 건강, 위장 |
| `weight` | 비만·다이어트 | 비만, 다이어트, 체중, 체중 관리 |
| `renal_urinary` | 신장·비뇨기 | 신장, 비뇨기, 요로, 방광 |
| `heart` | 심장 | 심장, heart, cardiac |
| `immune` | 면역 | 면역, immune, immunity |
| `eye` | 눈 | 눈, 눈 건강, 안구, 시력 |
| `oral` | 구강 | 구강, 구강 건강, 치아, dental |

Every profile input, search filter, score calculation, analysis card, and UI message must resolve through the canonical IDs before comparing tags, ingredients, or quantitative evidence.

## Evaluation Result

Each selected concern must produce one structured result with:

- canonical concern ID
- original profile label
- status
- evidence level
- matched product tags
- matched ingredient evidence
- quantitative checks
- missing required fields
- caution reasons
- user-facing facts
- confidence
- scoring contribution
- source references for medical thresholds

Allowed statuses are `supported`, `possible`, `tag_only`, `not_supported`, `unknown`, and `not_applicable`.

## Concern Fit Scoring

Concern fit remains a maximum 20-point suitability component. For multiple selected concerns, divide 20 points equally across unique canonical concerns.

Evidence factors:

- validated quantitative evidence supports the concern: 100%
- relevant product tag plus relevant named functional ingredient, amount unknown: 50%
- product tag only: 25%
- ingredient only with no supporting tag and unknown quantity: at most 25%
- unknown, not applicable, not supported, or data absent: 0%

Renal/urinary and heart concerns cannot be marked supported from a tag or ingredient name alone. They require appropriate quantitative or verified product evidence. A contradictory quantitative signal prevents positive recommendation language for that concern.

## Missing Data

Unknown data must never become safe, no allergy, suitable, recommended, AAFCO-compliant, NRC-compliant, or confirmed absent. Missing or incomplete ingredients, tags, or guaranteed analysis must produce explicit unknown/insufficient-data states and reviewable data-gap signals.

Ingredient presence without a comparable amount must not satisfy an mg/1000 kcal threshold. Product tags are tag evidence only.

## User-Facing Copy

No UI surface may create recommendation wording directly from a numeric threshold such as `score >= 75`.

Do not show reassuring phrases such as "추천합니다", "안심하고 먹을 수 있어요", "매우 잘 맞아요", "질환에 적합해요", "알레르기 성분 미포함", or "주의 성분 없음" unless the structured verdict and confidence gate allow them.

Medical or nutritional thresholds must carry evidence records describing source, source date/version, species, life stage, healthy-animal vs diagnosed-disease scope, nutrient, unit, threshold/range, measured/declared/calculated/estimated value type, evidence strength, and limitations.

Every retained threshold must also identify its issuing organization, document title, exact URL when available, page/section/table, complete-food applicability, product form, nutrient basis, normative/clinical/internal classification, and whether it is enabled for judgment.

Do not describe general profile concerns as diagnoses, treatments, prevention, cures, therapeutic suitability, or guaranteed improvement.

## Runtime Evaluator

`src/health/evaluator.ts` is the canonical concern evaluator. It keeps the legacy disease engine available for shadow comparison, but produces the structured result that scoring and UI surfaces should consume in later integration PRs.

Evaluator rules:

- product tags are tag evidence only
- named functional ingredients without an amount are possible evidence only
- ingredient presence never passes an mg/1000 kcal threshold
- `null`, `undefined`, blank, whitespace, malformed, non-finite, negative, and inequality-qualified declarations are unavailable for exact comparison
- dry-matter calculations require declared moisture; the evaluator does not assume 10% moisture
- calculated values retain their exact label-declared inputs and qualifiers
- quantitative support requires a comparable value, verified input units, an applicable rule, and `judgmentEnabled: true`
- cat-only and dog-only rules do not cross species
- adult-only and complete-food-only rules do not apply to incompatible life stages, treats, supplements, toppers, or unknown product categories
- form-dependent rules require an explicit compatible dry/wet formulation
- pass plus unknown required evidence cannot become `supported`
- non-applicable rules do not count as passes, failures, or missing fields
- contradictory quantitative checks return `not_supported`
- renal/urinary and heart concerns cannot become `supported` from tags or ingredient names alone
- renal and lower-urinary evidence remain separate inside the combined public concern
- the exact first profile input label is preserved; unrecognized inputs are available from `evaluateHealthConcernsDetailed()` and receive no result or points
- `immune` returns a real concern result without inventing a disease card

## Threshold Provenance Audit

As of 2026-09-03, no quantitative threshold in the evaluator is enabled for health-concern judgment. The checks remain deterministic, structured, and informational so the data path can be audited without producing confirmed support, contradiction penalties, confidence, or score contribution.

| Concern/check | Audit outcome | Judgment status |
| --- | --- | --- |
| Digestive crude fiber 3-6% DMB | Internal exploratory heuristic. Crude fiber is not total dietary fiber and the range is not a complete digestive-suitability standard. | Disabled |
| Weight crude fat <=12% DMB | The reviewed WSAVA nutrition resources emphasize patient assessment and body/muscle condition; no exact source for this universal product cutoff was found. The prior WSAVA attribution was removed. | Disabled |
| Weight crude protein >=28% DMB | No exact WSAVA source and applicability for this universal cutoff was found. The prior WSAVA attribution was removed. | Disabled |
| Renal phosphorus <=500 mg/1000 kcal | The prior universal renal/urinary attribution and exact primary table could not be verified. A clinical renal target cannot represent generic lower-urinary suitability. | Disabled |
| Adult cat taurine, dry | FEDIAF 2025 Table III-4b, page 19 publishes 0.33 g/1000 kcal at MER 75 for complete dry cat food. The evaluator records 330 mg/1000 kcal, but the repository taurine input has no verified unit/provenance. | Disabled pending input-unit provenance |
| Adult cat taurine, canned/wet | FEDIAF 2025 Table III-4b, page 19 publishes 0.67 g/1000 kcal at MER 75 for complete canned cat food. The evaluator records 670 mg/1000 kcal, but the repository taurine input has no verified unit/provenance. | Disabled pending input-unit provenance |

Primary references reviewed:

- FEDIAF, *Nutritional Guidelines for Complete and Complementary Pet Food for Cats and Dogs*, publication September 2025, Table III-4b page 19: https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf
- WSAVA Global Nutrition Committee resources and 2011 nutritional assessment guidelines: https://wsava.org/global-guidelines/global-nutrition-guidelines/

Healthy-animal complete-food recommendations are not disease-treatment guarantees. Product tags and named ingredients never prove therapeutic suitability. Reactivation requires a directly verified primary threshold, exact applicability metadata, a known input unit and provenance, conservative aggregation tests, and separate review before any score or UI integration.
