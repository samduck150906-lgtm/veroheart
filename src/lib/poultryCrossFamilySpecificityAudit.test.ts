import { describe, expect, it } from 'vitest';
import { buildPoultryCrossFamilySpecificityAudit } from './poultryCrossFamilySpecificityAudit';

describe('poultry cross-family specificity audit', () => {
  it('captures Poultry Allergy Policy v1.0 named-poultry behavior', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.auditKind).toBe('poultry_cross_family_specificity_audit');
    expect(audit.summary).toEqual({
      namedPairs: 9,
      sameSourceMatches: 3,
      crossSpeciesHardMatches: 0,
      crossSpeciesCautionMatches: 6,
      genericPoultryMatches: 3,
      unknownAnimalByproductNamedMatches: 0,
      crossSpeciesScoreCappedProducts: 0,
    });
  });

  it('routes every off-diagonal chicken duck turkey pair to cross caution, not hard allergy', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();
    const offDiagonal = audit.namedMatrix.filter(
      (row) => row.allergyFamily !== row.ingredientFamily,
    );

    expect(offDiagonal).toHaveLength(6);
    for (const row of offDiagonal) {
      expect(row.currentMatch, `${row.allergyLabel} -> ${row.ingredientLabel}`).toBe(false);
      expect(row.relationshipKind).toBe('cross_caution');
      expect(row.matchKind).toBe('cross_poultry_caution');
      expect(row.sharedTags).toContain('poultry');
    }
  });

  it('keeps same-species poultry proteins as hard matches', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();
    const diagonal = audit.namedMatrix.filter(
      (row) => row.allergyFamily === row.ingredientFamily,
    );

    expect(diagonal).toHaveLength(3);
    for (const row of diagonal) {
      expect(row.currentMatch).toBe(true);
      expect(row.relationshipKind).toBe('hard');
      expect(row.matchKind).toBe('same_named_source');
      expect(row.sharedTags).toEqual(expect.arrayContaining([row.allergyFamily, 'poultry']));
    }
  });

  it('applies the modest caution penalty without the hard display cap', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.crossSpeciesScoreImpact).toHaveLength(6);
    for (const row of audit.crossSpeciesScoreImpact) {
      expect(row.allergyHits).toEqual([]);
      expect(row.allergyPenalty).toBe(0);
      expect(row.allergyCautionPenalty).toBe(8);
      expect(row.displayScore).toBe(row.recommendationScore);
      expect(row.displayScore).toBeGreaterThan(9);
    }
  });

  it('keeps explicit broad poultry allergy hard while unknown animal byproduct stays unnamed', () => {
    const audit = buildPoultryCrossFamilySpecificityAudit();

    expect(audit.genericPoultryMatches.every((row) => row.currentMatch)).toBe(true);
    expect(
      audit.unknownAnimalByproductNamedMatches.every((row) => !row.currentMatch),
    ).toBe(true);
  });

  it('is an audit only', () => {
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