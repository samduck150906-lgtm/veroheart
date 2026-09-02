import { describe, expect, it } from 'vitest';
import {
  MEANINGFUL_SCORE_GAP,
  resolveComparisonVerdict,
  type ComparisonCandidate,
} from './comparisonVerdict';

function candidate(over: Partial<ComparisonCandidate> = {}): ComparisonCandidate {
  return {
    id: 'p1', name: '제품', score: 70,
    allergyLevel: 'none', dangerCount: 0, cautionCount: 0, matchedConcerns: [],
    ...over,
  };
}

describe('비교 판정', () => {
  it('제품이 하나면 판정하지 않는다', () => {
    expect(resolveComparisonVerdict([candidate()])).toEqual({ kind: 'none' });
  });

  it('완전히 같은 조건이면 우승자를 만들지 않는다', () => {
    // 예전에는 점수 최댓값을 reduce 로 골라 먼저 담긴 제품이 무조건 이겼다.
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'a', name: 'A' }),
      candidate({ id: 'b', name: 'B' }),
    ]);
    expect(verdict.kind).toBe('tie');
    if (verdict.kind === 'tie') expect(verdict.leaders.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('점수 차가 미미하면 동점으로 본다', () => {
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'a', score: 70 }),
      candidate({ id: 'b', score: 70 + MEANINGFUL_SCORE_GAP - 1 }),
    ]);
    expect(verdict.kind).toBe('tie');
  });

  it('점수 차가 충분하고 근거가 있으면 우세를 말한다', () => {
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'a', name: 'A', score: 82, dangerCount: 0 }),
      candidate({ id: 'b', name: 'B', score: 60, dangerCount: 2 }),
    ]);
    expect(verdict.kind).toBe('winner');
    if (verdict.kind === 'winner') {
      expect(verdict.winner.id).toBe('a');
      expect(verdict.runnerUp.id).toBe('b');
      expect(verdict.reasons.length).toBeGreaterThan(0);
      expect(verdict.reasons.join(' ')).toContain('2개 적어');
    }
  });

  it('점수만 다르고 설명할 근거가 없으면 우세라고 말하지 않는다', () => {
    // 숫자만 높고 이유를 못 대는 우열은 사용자에게 도움이 되지 않는다.
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'a', score: 90 }),
      candidate({ id: 'b', score: 50 }),
    ]);
    expect(verdict.kind).toBe('tie');
  });

  it('점수가 같아도 알레르기 신호가 다르면 그건 진짜 차이다', () => {
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'safe', name: '안전', score: 70, allergyLevel: 'none' }),
      candidate({ id: 'risky', name: '위험', score: 70, allergyLevel: 'hard' }),
    ]);
    expect(verdict.kind).toBe('winner');
    if (verdict.kind === 'winner') {
      expect(verdict.winner.id).toBe('safe');
      expect(verdict.reasons.join(' ')).toContain('알레르기');
    }
  });

  it('건강 고민 적합성도 근거로 쓴다', () => {
    const verdict = resolveComparisonVerdict([
      candidate({ id: 'a', score: 85, matchedConcerns: ['피부', '관절'] }),
      candidate({ id: 'b', score: 60, matchedConcerns: [] }),
    ]);
    expect(verdict.kind).toBe('winner');
    if (verdict.kind === 'winner') expect(verdict.reasons.join(' ')).toContain('피부');
  });
});
