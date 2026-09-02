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

Do not describe general profile concerns as diagnoses, treatments, prevention, cures, therapeutic suitability, or guaranteed improvement.
