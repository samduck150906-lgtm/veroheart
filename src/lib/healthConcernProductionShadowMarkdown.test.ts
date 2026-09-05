import { describe, expect, it } from 'vitest';
import { buildHealthConcernProductionShadowExecutionReport } from './healthConcernProductionShadow';
import { renderHealthConcernProductionShadowMarkdown } from './healthConcernProductionShadowMarkdown';

const source = [{
  product_id: 'private-product-id',
  product_name: 'Private product name',
  main_category: 'food',
  target_pet_type: 'dog',
  ingredient_id: null,
  sort_order: null,
  ingredient_name_ko: null,
  ingredient_name_en: null,
  ingredient_risk_level: null,
}];

describe('health-concern production shadow aggregate Markdown', () => {
  it('is deterministic, aggregate-only, and uses the required safety language', () => {
    const report = buildHealthConcernProductionShadowExecutionReport(source);
    const provenance = {
      filename: 'copied-input.json',
      sizeBytes: 123,
      sha256: 'abc123',
      analyzedAt: '2026-09-05T00:00:00Z',
    };
    const first = renderHealthConcernProductionShadowMarkdown(provenance, report);
    const second = renderHealthConcernProductionShadowMarkdown(provenance, report);
    expect(second).toBe(first);
    expect(first).toContain('**shadow analysis**');
    expect(first).toContain('hypothetical candidate results');
    expect(first).toContain('**insufficient evidence**');
    expect(first).toContain('Evidence-Qualified Interpretation');
    expect(first).toContain('Raw exploratory changes include insufficient-confidence rows');
    expect(first).toContain('Decision readiness: `not_decision_ready`');
    expect(first).toContain('Sufficient-confidence ranking comparison possible: no');
    expect(first).toContain('No runtime activation is authorized');
    expect(first).not.toContain('private-product-id');
    expect(first).not.toContain('Private product name');
  });
});
