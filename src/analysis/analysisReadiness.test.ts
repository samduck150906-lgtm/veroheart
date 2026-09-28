import { describe, expect, it } from 'vitest';
import { analysisReadinessCopy, getAnalysisReadiness } from './analysisReadiness';

describe('analysis readiness', () => {
  it('distinguishes unavailable, partial, ready, and blocked labels', () => {
    expect(getAnalysisReadiness([])).toEqual({
      status: 'unavailable', unknownCount: 0, ambiguousCount: 0, reasonCodes: ['no_label_items'],
    });
    expect(getAnalysisReadiness([
      { matchStatus: 'matched' }, { matchStatus: 'unmatched' },
    ]).status).toBe('partial');
    expect(getAnalysisReadiness([{ matchStatus: 'matched' }]).status).toBe('ready');
    expect(getAnalysisReadiness([
      { matchStatus: 'matched' }, { matchStatus: 'ambiguous' },
    ])).toMatchObject({ status: 'blocked', ambiguousCount: 1 });
  });

  it('keeps concise false-safe UI copy', () => {
    expect(analysisReadinessCopy('unavailable')).toBe('등록된 원료 정보가 없어요');
    expect(analysisReadinessCopy('partial')).toBe('확인되지 않은 원료가 있어 부분 분석만 제공해요');
    expect(analysisReadinessCopy('blocked')).toBe('원료 정보가 서로 달라 확인이 필요해요');
  });
});
