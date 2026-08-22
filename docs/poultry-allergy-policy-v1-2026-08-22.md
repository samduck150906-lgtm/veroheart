# Poultry Allergy Policy v1.0

Date: 2026-08-22

## Scope

This policy is intentionally limited to poultry allergy relationships. It does not generalize cross-family cautions to beef/lamb, fish species, or other animal families without a separate evidence review.

## Clinical interpretation boundary

Veterinary food allergy is a clinical diagnosis. Elimination diet followed by controlled dietary challenge remains the reference approach; serum food-specific IgE alone is not sufficient to establish clinical food allergy. Published canine/feline studies support substantial immunologic overlap among chicken, duck, and turkey, but this does not establish blanket clinical equivalence for every animal.

Relevant evidence reviewed for this policy includes:

- Merck Veterinary Manual, Cutaneous Food Allergy in Animals (reviewed/updated 2025): elimination/challenge is the reliable diagnostic approach; cross-reactivity can complicate novel-protein selection; serologic tests do not reliably establish clinical reactivity.
- Olivry et al., 2017, PMID 28818076: chicken-specific IgE commonly recognized duck/turkey proteins; extensive hydrolysis markedly reduced IgE recognition compared with non-hydrolyzed or mildly hydrolyzed poultry materials.
- Baumann, Fritz & Mueller, 2020, PMID 33276389: concurrent food-specific IgE reactions clustered among phylogenetically related animal sources, including poultry; concurrent sensitization does not by itself establish clinical cross-allergy.
- Bizikova & Olivry, 2016, PMID 27307314: clinically chicken-reactive dogs did not respond uniformly to different hydrolyzed poultry diets; source and degree of hydrolysis mattered.
- Canine chicken-allergen work, PMID 34734435: supports specific chicken allergen proteins and a theoretical basis for cross-reactivity while leaving clinical relevance to further study.
- Canine egg-white allergen work, PMID 27436445: supports egg proteins as their own allergen targets; egg is not automatically treated as chicken-meat allergy.

## Runtime relationship tiers

### HARD

Use for the explicitly named poultry protein source and for explicit broad poultry allergy.

Examples:

- allergy `닭` + `닭고기`, `계육분`, `치킨밀`, `닭간`, `닭연골`
- allergy `오리` + named duck protein
- allergy `칠면조` + named turkey protein
- allergy `가금류` + named chicken/duck/turkey protein or generic poultry protein/byproduct

Effect: existing hard allergy penalty remains unchanged: first hard allergy hit -90, additional hard hits +5 up to -100, and the existing hard-allergy display ceiling remains in force.

### CROSS_CAUTION

Use when a named poultry allergy encounters a different named poultry species.

Examples:

- allergy `닭` + `오리고기`
- allergy `닭` + `칠면조고기`
- allergy `오리` + `닭고기`

Effect: do not label as confirmed allergy and do not apply the hard display cap. Veroheart calibration is -8 for one distinct related poultry source, +4 for a second distinct related poultry source, capped at -12.

### STRONG_CAUTION

Use when a named poultry allergy encounters a generic poultry source whose species is not identified, such as `가금류부산물`.

Effect: -15 Veroheart calibration. This represents uncertainty about whether the explicitly avoided source may be present; it is not converted into a named-source hard allergy.

### PROCESSING_CAUTION

Use for source-specific poultry fat/oil, e.g. `닭지방`, when the user has the matching poultry allergy.

Rationale: food allergy is primarily a reaction to protein antigens, so fat is not treated as equivalent to named meat protein. Label data generally does not establish purification or residual-protein level, so it is not treated as automatically safe either.

Effect: -5 Veroheart calibration.

### HYDROLYSIS_CAUTION

Use for hydrolyzed poultry ingredients when source matches or is relevant to the registered poultry allergy.

Rationale: clinical and immunologic evidence shows that hydrolysis degree and source matter; a generic `hydrolyzed` label is not enough to guarantee tolerance.

Effect: -10 Veroheart calibration.

### NONE

- chicken-meat allergy does not automatically imply egg allergy
- unknown generic `동물성부산물` is not inferred to be chicken, duck, or turkey
- non-poultry cross-family caution rules are outside v1 scope

## Penalty composition

- If any HARD allergy hit exists, caution penalty is 0; caution never stacks on top of the hard -90/-100 pathway.
- If several poultry caution kinds coexist without a HARD hit, use the strongest applicable caution penalty rather than summing all caution categories.
- Numeric penalties are Veroheart product-calibration choices. They are not effect sizes or probabilities reported by veterinary studies.

## User-facing language

HARD and CAUTION must remain visually and linguistically distinct.

HARD example:

`등록한 알레르기·회피 성분이 포함되어 있어 급여를 권하지 않아요.`

CROSS_CAUTION example:

`관련 가금류 성분을 주의해 주세요. 등록한 알레르기와 같은 가금류 계열의 다른 원료가 포함되어 있으며, 일부 동물에서 교차반응 가능성이 보고되어 있습니다.`

Generic poultry source example:

`알레르기 원료 포함 가능성을 확인해 주세요. 가금류로만 표시되어 있어 등록한 알레르기 원료가 포함됐는지 확인이 필요합니다.`

Caution copy must not state that cross-reactivity is confirmed in the individual animal.

## Production boundary

This policy changes matcher, personalized score/ranking, and visible warning behavior for affected products. It does not write or migrate production data, change Supabase schema, alter env/secrets, deploy, or enable unrelated runtime flags.
