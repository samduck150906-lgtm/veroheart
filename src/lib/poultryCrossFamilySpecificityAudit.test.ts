import { describe, expect, it } from 'vitest';
import { buildPoultryCrossFamilySpecificityAudit } from './poultryCrossFamilySpecificityAudit';

describe('poultry cross-family specificity audit', () => {
  it('captures the current named poultry cross-match matrix without changing runtime behavior', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.auditKind).toBe('poultry_cross_family_specificity_audit');
    expect(audit.summary).toEqual({
      namedPairs: 9,
      sameSourceMatches: 3,
      crossSpeciesMatches: 6,
      genericPoultryMatches: 3,
      unknownAnimalByproductNamedMatches: 0,
      crossSpeciesScoreCappedProducts: 6,
    });
  });

  it('shows that every off-diagonal chicken duck turkey pair currently matches through shared poultry', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();
    const offDiagonal = audit.namedMatrix.filter(
      (row) => row.allergyFamily !== row.ingredientFamily,
    );

    expect(offDiagonal).toHaveLength(6);
    for (const row of offDiagonal) {
      expect(row.currentMatch, `${row.allergyLabel} -> ${row.ingredientLabel}`).toBe(true);
      expect(row.matchKind).toBe('shared_poultry_crossmatch');
      expect(row.sharedTags).toContain('poultry');
      expect(row.sharedTags).not.toContain(row.allergyFamily);
    }
  });

  it('keeps same-species poultry matches distinct from shared-poultry crossmatches', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();
    const diagonal = audit.namedMatrix.filter(
      (row) => row.allergyFamily === row.ingredientFamily,
    );

    expect(diagonal).toHaveLength(3);
    for (const row of diagonal) {
      expect(row.currentMatch).toBe(true);
      expect(row.matchKind).toBe('same_named_source');
      expect(row.sharedTags).toEqual(expect.arrayContaining([row.allergyFamily, 'poultry']));
    }
  });

  it('shows the current cross-species match reaches the allergy penalty and display cap path', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.crossSpeciesScoreImpact).toHaveLength(6);
    for (const row of audit.crossSpeciesScoreImpact) {
      expect(row.allergyHits).toEqual([row.allergyLabel]);
      expect(row.allergyPenalty).toBe(90);
      expect(row.displayScore).toBeLessThanOrEqual(9);
    }
  });

  it('keeps generic poultry broad while unknown animal byproduct stays unnamed', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.genericPoultryMatches.every((row) => row.currentMatch)).toBe(true);
    expect(
      audit.unknownAnimalByproductNamedMatches.every((row) => !row.currentMatch),
    ).toBe(true);
  });

  it('is a diagnostic audit only', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.safety).toEqual({
      changesMatcher: false,
      changesScoreLogic: false,
      changesUi: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      executesSql: false,
      changesEnvOrDeploy: false,
    });
  });
});
