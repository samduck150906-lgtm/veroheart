# Poultry Specificity Owner Review Packet — 2026-08-20

## Why this packet exists

The current matcher treats named chicken, duck, and turkey allergies as hard cross-matches because all three share the broader `poultry` tag.

The diagnostic audit shows all six named cross-species pairs currently enter the allergy penalty path in the representative fixture.

Veterinary evidence supports biologic and immunologic overlap among poultry proteins, but does not establish blanket clinical equivalence for every named poultry species in every dog or cat.

This is therefore a genuine product-policy decision rather than a safe internal refactor.

## Evidence basis

- Olivry, Bexley, Mougeot, BMC Veterinary Research 2017, PMID 28818076: substantial IgE recognition overlap among chicken, duck, and turkey extracts in selected canine/feline sera.
- Baumann, Fritz, Mueller 2020, PMID 33276389: high concurrent poultry IgE reactions, especially chicken/duck, while explicitly noting uncertainty between co-sensitization, true cross-reaction, and clinical relevance.
- Merck Veterinary Manual, Cutaneous Food Allergy in Animals: protein similarity makes cross-reactivity plausible, but clinical relevance is not yet clear.

## Option A — keep current conservative policy

Named chicken, duck, and turkey allergies all hard-match one another.

Advantages:

- maximum avoidance conservatism
- no app behavior change

Tradeoff:

- uncertain cross-species risk is represented as confirmed hard allergy equivalence
- a dog with only chicken recorded can receive a severe penalty for duck or turkey ingredients

## Option B — named-source hard block + related-poultry caution

Recommended policy.

- same named source → hard allergy hit
- generic poultry allergy → broad hard allergy hit
- different named poultry species → related-poultry caution, not hard confirmed allergy hit

Advantages:

- preserves strong protection for the explicitly recorded allergen
- keeps broad protection for a genuinely broad `poultry` allergy
- preserves awareness of plausible cross-reactivity without claiming certainty the evidence does not provide

Tradeoff:

- requires a visible caution path/copy and changes score/recommendation behavior for named cross-species cases

## Option C — named species only

- same named source → hard allergy hit
- generic poultry allergy → broad hard allergy hit
- different named poultry species → no hard hit and no related-poultry warning

Advantages:

- avoids cross-species false-positive hard hits
- simpler runtime behavior

Tradeoff:

- removes warning for a biologically plausible cross-reactivity concern

## Production impact limitation

The repository does not contain the complete current production product-ingredient dataset. Therefore this repo-only packet cannot state the exact number of production products whose displayed score/ranking would change.

The representative fixture confirms the direction and severity of the current behavior, not the production row count.

## Decision boundary

No matcher, score, display, UI, database, SQL, env, deploy, or runtime-flag change is included in this packet.

A change from Option A to B or C is user-visible and must receive owner approval before implementation.
