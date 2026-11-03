# Veterinary guidance flag: positive warning, not clinical clearance

`requires_veterinary_guidance=TRUE` is an explicit positive warning. FALSE, NULL or
a missing projection does not establish consultation unnecessary, an ordinary
diet, nutritional completeness, or feeding safety. The existing wire mapper uses
FALSE as compatibility default; no clinical verification state is created by that
mapping or by the proposed database column default.

Consumers reviewed:
- Row mapper/type: compatibility boolean only; no verified-normal-diet field.
- Home and detail alternatives: TRUE exclusions are additional vetoes, not
  affirmative clinical clearance for all remaining rows. Existing species,
  evidence, allergy/danger and display policies continue to apply. No score or
  recommendation order changed by this presentation patch.
- analyzeFeed: TRUE withholds the generic calorie-derived feeding calculation.
  FALSE does not select complete food; existing product category logic does that.
  Existing calculation/results are unchanged; the detail title now explicitly
  calls the amount a calorie-based reference and says it cannot establish ordinary
  food or feeding safety.
- Detail: explicit TRUE warning now appears alongside the feeding section even
  without a source URL. Previously the standalone warning required that link, and
  withheld feeding could be explained incorrectly as missing calories. The new
  message states veterinary withholding instead. FALSE/absent displays an explicit
  unconfirmed-consultation notice; no diagnosis is inferred from a product name.
- Report/conclusion/getAssessedNutritionWarnings: positive veterinary warning
  remains, alongside existing deficits, calcium/phosphorus, allergy/danger/species
  warnings. diseaseRules/DiseaseFitCard clinical notes are independent of this
  boolean and are not suppressed by FALSE. Nutrition scope remains unchanged.
- Import SQL: supported manufacturer source URL determines explicit TRUE for
  veterinary products when imports actually run. A column default is not equivalent
  to that product/source review; imports are not part of this emergency repair.

Synthetic regressions cover FALSE/absent detail notices and TRUE without source URL
with known calories. Numeric feeding/score logic unchanged; no operation on hosted
products, inference of missing clinical facts or retrospective data backfill.
Known veterinary rows with missing positive flags remain a data-review risk. This
UI disclosure does not certify those rows and does not change currently deployed
main before this Draft is separately approved/merged/deployed.
