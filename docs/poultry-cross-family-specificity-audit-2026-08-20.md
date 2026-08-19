# Poultry Cross-Family Specificity Audit — 2026-08-20

## Purpose

This audit captures the current runtime behavior for named poultry allergies without changing the matcher, score logic, UI, database, env, or deploy state.

The target question is whether a named allergy such as chicken should automatically hard-match duck and turkey simply because all three share the broader `poultry` tag.

## Current Runtime Behavior

The matcher currently assigns:

- chicken labels → `chicken`, `poultry`
- duck labels → `duck`, `poultry`
- turkey labels → `turkey`, `poultry`

Because allergy matching uses any shared family tag, all six off-diagonal named pairs currently match:

- chicken allergy → duck ingredient
- chicken allergy → turkey ingredient
- duck allergy → chicken ingredient
- duck allergy → turkey ingredient
- turkey allergy → chicken ingredient
- turkey allergy → duck ingredient

The diagnostic fixture also confirms that these cross-species matches enter the normal allergy penalty path and can cap the displayed recommendation score at 9 or below.

Generic `가금류` remains broad across chicken, duck, and turkey.

Generic `동물성부산물` remains unnamed and does not become chicken, duck, or turkey.

## Veterinary Evidence Reviewed

### Olivry, Bexley, Mougeot — BMC Veterinary Research, 2017

PMID: 28818076

Sera from dogs and cats selected across levels of chicken-specific IgE frequently recognized duck and turkey meat extracts as well. This supports meaningful immunologic overlap among poultry proteins.

However, the study was an IgE recognition/hydrolysate study rather than a clinical oral challenge proving that every animal allergic to one named poultry species will clinically react to every other named poultry species.

### Baumann, Fritz, Mueller — 2020

PMID: 33276389

A large canine serum-IgE dataset found high rates of concurrent reactions among related allergens, including the poultry group and especially chicken with duck.

The authors explicitly note that further investigation is required to distinguish true cross-reactions from co-sensitization and to determine clinical relevance.

### Merck Veterinary Manual — Cutaneous Food Allergy in Animals

The manual notes amino-acid similarity among several meat allergen sources and the resulting possibility of cross-reactivity, while also stating that the clinical relevance of these similarities is not yet clear.

## Audit Interpretation

The evidence supports treating related poultry species as a legitimate cross-reactivity concern.

It does **not** clearly support representing every named chicken/duck/turkey cross-species pair as a confirmed hard allergy equivalent in every dog or cat.

Therefore the current behavior is best described as **conservative but clinically over-broad** rather than clearly wrong or clearly validated.

A future policy could distinguish:

1. same named source → hard allergy hit
2. generic poultry allergy → broad hard allergy hit
3. different named poultry species → cross-reactivity caution/review state rather than silently treating it as the same confirmed source

That policy would change user-visible score/recommendation behavior, so this audit does not implement it.

## Safety Boundary

This PR is diagnostic helper/test/docs only.

It does not:

- change `allergyFamilyMatcher`
- change scoring or display caps
- change UI/copy/ranking
- access Supabase
- execute SQL
- mutate production rows
- change env/deploy
- enable a runtime flag

## Next Step

After this audit is mechanically confirmed, the next step is to prepare a compact owner-attention packet comparing the current conservative policy with a species-specific-plus-cross-reactivity-caution policy. No runtime change should be merged before that owner-visible decision.
