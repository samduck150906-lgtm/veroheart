import { describe, expect, it } from 'vitest';

const groups = {
  fresh: { canonicalId: 'chicken', sourceFamily: 'chicken', scoreReady: false },
  processed: { canonicalId: 'chicken_meal', sourceFamily: 'chicken', scoreReady: false },
  separateReview: { canonicalId: null, sourceFamily: 'chicken_or_poultry', scoreReady: false },
} as const;

describe('chicken-family alias policy', () => {
  it('keeps fresh meat and processed meal as separate canonical concepts', () => {
    expect(groups.fresh.canonicalId).toBe('chicken');
    expect(groups.processed.canonicalId).toBe('chicken_meal');
    expect(groups.fresh.canonicalId).not.toBe(groups.processed.canonicalId);
  });

  it('allows both canonical concepts to share a source family without collapsing them', () => {
    expect(groups.fresh.sourceFamily).toBe('chicken');
    expect(groups.processed.sourceFamily).toBe('chicken');
  });

  it('keeps adjacent organ fat cartilage and generic poultry terms in separate review', () => {
    expect(groups.separateReview.canonicalId).toBeNull();
    expect(groups.separateReview.sourceFamily).toBe('chicken_or_poultry');
  });

  it('does not approve scoring usage from this policy fixture', () => {
    expect(groups.fresh.scoreReady).toBe(false);
    expect(groups.processed.scoreReady).toBe(false);
    expect(groups.separateReview.scoreReady).toBe(false);
  });
});
