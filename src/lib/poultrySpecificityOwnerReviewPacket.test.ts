import { describe, expect, it } from 'vitest';
import { buildPoultrySpecificityOwnerReviewPacket } from './poultrySpecificityOwnerReviewPacket';

describe('poultry specificity owner review packet', () => {
  it('summarizes the current blanket cross-species behavior', () => {
    const packet = buildPoultrySpecificityOwnerReviewPacket();

    expect(packet.packetKind).toBe('poultry_specificity_owner_review_packet');
    expect(packet.currentBehavior).toEqual({
      namedPairs: 9,
      sameSourceMatches: 3,
      crossSpeciesMatches: 6,
      crossSpeciesScoreCappedProductsInFixture: 6,
      genericPoultryMatches: 3,
      unknownAnimalByproductNamedMatches: 0,
    });
  });

  it('keeps the evidence interpretation distinct from a blanket clinical equivalence claim', () => {
    const packet = buildPoultrySpecificityOwnerReviewPacket();

    expect(packet.evidenceAssessment).toMatchObject({
      immunologicOverlapSupported: true,
      blanketClinicalEquivalenceEstablished: false,
    });
  });

  it('offers three explicit policy options and recommends hard named-source plus related caution', () => {
    const packet = buildPoultrySpecificityOwnerReviewPacket();
    const byId = new Map(packet.options.map((option) => [option.id, option]));

    expect(packet.options).toHaveLength(3);
    expect(packet.recommendedOptionId).toBe(
      'species_specific_hard_block_plus_related_caution',
    );
    expect(byId.get('keep_current_conservative')).toMatchObject({
      differentNamedPoultryHardHit: true,
      differentNamedPoultryCaution: false,
      userVisibleChange: false,
    });
    expect(byId.get('species_specific_hard_block_plus_related_caution')).toMatchObject({
      sameNamedSourceHardHit: true,
      genericPoultryHardHit: true,
      differentNamedPoultryHardHit: false,
      differentNamedPoultryCaution: true,
      userVisibleChange: true,
    });
    expect(byId.get('species_specific_only')).toMatchObject({
      differentNamedPoultryHardHit: false,
      differentNamedPoultryCaution: false,
      userVisibleChange: true,
    });
  });

  it('requires an owner decision before any runtime policy change', () => {
    const packet = buildPoultrySpecificityOwnerReviewPacket();

    expect(packet.ownerDecisionRequired).toBe(true);
    expect(packet.productionImpact.exactAffectedProductCountKnown).toBe(false);
    expect(packet.safety).toEqual({
      appliesMatcherChange: false,
      appliesScoreChange: false,
      appliesUiChange: false,
      usesSupabaseClient: false,
      executesSql: false,
      mutatesProductionRows: false,
      changesEnvOrDeploy: false,
    });
  });
});
