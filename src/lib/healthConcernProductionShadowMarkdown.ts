import type { HealthConcernProductionShadowExecutionReport } from './healthConcernProductionShadow';

export interface HealthConcernProductionShadowProvenance {
  filename: string;
  sizeBytes: number;
  sha256: string;
  analyzedAt: string;
}

function bulletCounts(values: Record<string, number>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `- \`${key}\`: ${count.toLocaleString('en-US')}`)
    .join('\n');
}

function numericBulletCounts(values: Record<string, number>): string {
  return Object.entries(values)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, count]) => `- \`${key}\`: ${count.toLocaleString('en-US')}`)
    .join('\n');
}

function concernStatusTable(report: HealthConcernProductionShadowExecutionReport): string {
  const counts = report.shadow.summary.statusCountsByConcern;
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return [
    '| Concern | Possible | Unknown | Not applicable |',
    '| --- | ---: | ---: | ---: |',
    ...rows.map(([concern, statuses]) =>
      `| \`${concern}\` | ${statuses.possible ?? 0} | ${statuses.unknown ?? 0} | ${statuses.not_applicable ?? 0} |`),
  ].join('\n');
}

export function renderHealthConcernProductionShadowMarkdown(
  provenance: HealthConcernProductionShadowProvenance,
  report: HealthConcernProductionShadowExecutionReport,
): string {
  const input = report.inputAudit;
  const adapter = report.adapter;
  const shadow = report.shadow.summary;
  const impact = report.impact;
  const healthEvidence = Object.entries(input.columns.healthEvidence)
    .filter(([, supplied]) => supplied)
    .map(([column]) => column);

  return `# Copied-Data Health-Concern Shadow Impact Report

## Boundary

This is a **shadow analysis** of one copied, local-only production JSON export. It reports hypothetical candidate results and does not change production behavior. **No runtime activation is authorized.** No Supabase client, credentials, SQL, database write, migration, environment setting, deployment setting, runtime scoring, runtime ranking, UI, allergy logic, or poultry logic was used or changed.

## Provenance

- Filename: \`${provenance.filename}\`
- Size: ${provenance.sizeBytes.toLocaleString('en-US')} bytes
- SHA-256: \`${provenance.sha256}\`
- Analyzed at: \`${provenance.analyzedAt}\`
- Input shape: copied Supabase joined-row JSON array
- Joined rows received: ${input.summary.joinedRows.toLocaleString('en-US')}
- Distinct product IDs: ${input.summary.distinctProductIds.toLocaleString('en-US')}
- Distinct product names: ${input.summary.distinctProductNames.toLocaleString('en-US')}

The raw JSON and product-level matrix remain outside the repository.

## Input And Adaptation

- Distinct ingredient IDs: ${input.summary.distinctIngredientIds.toLocaleString('en-US')}
- Distinct product-ingredient links: ${input.summary.distinctProductIngredientLinks.toLocaleString('en-US')}
- Rows without ingredient links: ${input.summary.rowsWithoutIngredientLinks.toLocaleString('en-US')}
- Linked rows missing ingredient names: ${input.summary.linkedRowsMissingIngredientNames.toLocaleString('en-US')}
- Exact duplicate rows: ${input.summary.exactDuplicateRows.toLocaleString('en-US')}
- Product metadata conflict IDs: ${input.summary.productMetadataConflictIds.toLocaleString('en-US')}
- Ingredient metadata conflict IDs: ${input.summary.ingredientMetadataConflictIds.toLocaleString('en-US')}
- Conflicting product-ingredient links: ${input.summary.conflictingProductIngredientLinks.toLocaleString('en-US')}
- Structurally rejected rows: 0
- Successfully adapted products: ${adapter.summary.productsAdapted.toLocaleString('en-US')}
- Rejected/conflicted products: ${adapter.summary.productsRejected.toLocaleString('en-US')}
- Products retaining a missing ingredient array: ${adapter.summary.productsWithoutIngredientLinks.toLocaleString('en-US')}

### Products By Supplied Target Species

${bulletCounts(input.productCounts.byTargetSpecies)}

### Products By Supplied Category

${bulletCounts(input.productCounts.byCategory)}

## Shadow Findings

### Evidence-Qualified Interpretation

- Raw exploratory grade changes: ${impact.rawExploratory.gradeChanges.toLocaleString('en-US')}
- Grade changes from insufficient-confidence rows: ${impact.byConfidence.insufficient.gradeChanges.toLocaleString('en-US')}
- Grade changes from partial-confidence rows: ${impact.byConfidence.partial.gradeChanges.toLocaleString('en-US')}
- Grade changes from sufficient-confidence rows: ${impact.byConfidence.sufficient.gradeChanges.toLocaleString('en-US')}
- Evidence-qualified grade changes at partial-or-better confidence: ${impact.evidenceQualified.gradeChanges.toLocaleString('en-US')}
- Sufficient-confidence rows: ${impact.byConfidence.sufficient.rows.toLocaleString('en-US')}
- Sufficient-confidence ranking comparison possible: ${impact.decisionGrade.rankingComparisonPossible ? 'yes' : 'no'}
- Decision readiness: \`${impact.decisionReadiness.result}\`

Raw exploratory changes include insufficient-confidence rows and are not evidence-qualified product ranking changes. Missing evidence is not negative evidence, and zero hypothetical candidate contribution must not be interpreted as product unsuitability. This analysis cannot authorize runtime activation.

### Raw Exploratory Counts

- Canonical concern definitions evaluated: ${shadow.profileDefinitionsEvaluated.toLocaleString('en-US')}
- Species-aware profile variants: ${shadow.profileVariantsEvaluated.toLocaleString('en-US')}
- Ranking cohorts: ${shadow.rankingCohortCount.toLocaleString('en-US')}
- Matrix rows: ${shadow.matrixRowCount.toLocaleString('en-US')}
- Computed hypothetical candidate rows: ${shadow.computedRows.toLocaleString('en-US')}
- Blocked-unrecognized rows: ${shadow.blockedUnrecognizedRows.toLocaleString('en-US')}
- Rows with insufficient evidence: ${shadow.rowsWithInsufficientEvidence.toLocaleString('en-US')}
- Rows whose quantitative evidence is entirely informational: ${shadow.rowsWhereAllQuantitativeEvidenceIsInformational.toLocaleString('en-US')}
- Confidence: ${shadow.confidenceCounts.sufficient.toLocaleString('en-US')} sufficient, ${shadow.confidenceCounts.partial.toLocaleString('en-US')} partial, ${shadow.confidenceCounts.insufficient.toLocaleString('en-US')} insufficient
- Maximum hypothetical increase: ${shadow.maximumIncrease?.delta ?? 'none'}
- Maximum hypothetical decrease: ${shadow.maximumDecrease?.delta ?? 'none'}
- Non-decision-grade hypothetical grade changes: ${impact.rawExploratory.gradeChanges.toLocaleString('en-US')}
- Products with a raw exploratory ordering change: ${impact.rawExploratory.ranking.productsWithOrderingChanges.toLocaleString('en-US')}
- Raw exploratory cohorts containing an ordering change: ${impact.rawExploratory.ranking.cohortsWithOrderingChanges.toLocaleString('en-US')}
- Invariant violations: ${shadow.invariantViolations.length.toLocaleString('en-US')}

### Concern Status Counts

${concernStatusTable(report)}

### Legacy Concern-Fit Distribution

${numericBulletCounts(shadow.legacyConcernFitDistribution)}

### Hypothetical Candidate Concern-Fit Distribution

${numericBulletCounts(shadow.candidateConcernFitDistribution)}

### Hypothetical Total-Score Delta Distribution

${numericBulletCounts(shadow.scoreDeltaDistribution)}

### Hypothetical Grade Comparison

- Changed: ${shadow.gradeChangeCounts.changed.toLocaleString('en-US')}
- Unchanged: ${shadow.gradeChangeCounts.unchanged.toLocaleString('en-US')}
- Not comparable: ${shadow.gradeChangeCounts.notComparable.toLocaleString('en-US')}

### Changes By Confidence

| Confidence | Rows | Grade changes | Score delta distribution |
| --- | ---: | ---: | --- |
| Insufficient | ${impact.byConfidence.insufficient.rows.toLocaleString('en-US')} | ${impact.byConfidence.insufficient.gradeChanges.toLocaleString('en-US')} | ${JSON.stringify(impact.byConfidence.insufficient.scoreDeltaDistribution)} |
| Partial | ${impact.byConfidence.partial.rows.toLocaleString('en-US')} | ${impact.byConfidence.partial.gradeChanges.toLocaleString('en-US')} | ${JSON.stringify(impact.byConfidence.partial.scoreDeltaDistribution)} |
| Sufficient | ${impact.byConfidence.sufficient.rows.toLocaleString('en-US')} | ${impact.byConfidence.sufficient.gradeChanges.toLocaleString('en-US')} | ${JSON.stringify(impact.byConfidence.sufficient.scoreDeltaDistribution)} |

### Confidence-Qualified Ranking

Row confidence is the weakest confidence among the row's selected concern results. Partial-or-better exploration excludes insufficient-confidence rows; sufficient-only analysis is the decision-grade threshold. A cohort requires at least ${impact.confidenceRule.minimumEligibleProductsPerRankingCohort} eligible products or it is non-comparable.

- Partial-or-better eligible rows: ${impact.evidenceQualified.ranking.eligibleRows.toLocaleString('en-US')}
- Partial-or-better comparable cohorts: ${impact.evidenceQualified.ranking.comparableCohorts.toLocaleString('en-US')}
- Partial-or-better non-comparable cohorts: ${impact.evidenceQualified.ranking.nonComparableCohorts.toLocaleString('en-US')}
- Partial-or-better cohorts with ordering changes: ${impact.evidenceQualified.ranking.cohortsWithOrderingChanges.toLocaleString('en-US')}
- Partial-or-better products with ordering changes: ${impact.evidenceQualified.ranking.productsWithOrderingChanges.toLocaleString('en-US')}
- Sufficient-only eligible rows: ${impact.decisionGrade.ranking.eligibleRows.toLocaleString('en-US')}
- Sufficient-only comparable cohorts: ${impact.decisionGrade.ranking.comparableCohorts.toLocaleString('en-US')}
- Sufficient-only non-comparable cohorts: ${impact.decisionGrade.ranking.nonComparableCohorts.toLocaleString('en-US')}

## Evidence Limitations

The export supplies ${healthEvidence.length === 0 ? 'none of' : healthEvidence.join(', ')} the health-tag, formulation, guaranteed-analysis, calorie, or ingredient-purpose evidence fields. All ${shadow.productsWithEmptyHealthTags.length.toLocaleString('en-US')} adapted products therefore retain empty or missing health tags, and ${shadow.productsWithMissingIngredientArrays.length.toLocaleString('en-US')} products retain missing ingredient arrays.

No matrix row reached sufficient confidence. Ingredient-name matches can support only the limited evidence encoded by the existing canonical evaluator; ingredient quantities are unavailable. Informational quantitative checks do not contribute points. Missing nutrition, purpose, tags, or ingredient links are **insufficient evidence**, not evidence that a product is unsuitable. No absent value was inferred from product names, categories, or other fields.

The computed values are hypothetical candidate results for comparison only. They are not a new score, recommendation, medical conclusion, or production behavior. No runtime activation is authorized.
`;
}
