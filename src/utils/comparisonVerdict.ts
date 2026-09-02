import type { AllergyDisplayLevel } from './allergyDisplay';

/**
 * 비교 결과 판정.
 *
 * 예전에는 점수 최댓값을 그냥 골라 "A가 나아" 라고 단정했다. 세 제품이 모두 같은
 * 점수여도 목록에서 먼저 담긴 제품이 이겼다고 표시돼, 근거 없는 우열이 만들어졌다.
 * 실제로 의미 있는 차이가 있을 때만 우세를 말하고, 아니면 비슷하다고 말한다.
 */

/** 이 점수 차 미만은 사용자에게 우열로 말하지 않는다. 점수는 반올림된 정수다. */
export const MEANINGFUL_SCORE_GAP = 3;

export interface ComparisonCandidate {
  id: string;
  /** 화면에 그대로 쓸 제품 이름. */
  name: string;
  score: number;
  allergyLevel: AllergyDisplayLevel;
  dangerCount: number;
  cautionCount: number;
  /** 프로필의 건강 고민 중 이 제품이 맞닿은 항목. */
  matchedConcerns: string[];
}

export type ComparisonVerdict =
  | { kind: 'none' }
  | { kind: 'tie'; leaders: ComparisonCandidate[] }
  | { kind: 'winner'; winner: ComparisonCandidate; runnerUp: ComparisonCandidate; reasons: string[] };

/** 알레르기 신호를 안전한 순서로 정렬하기 위한 순위 (작을수록 안전). */
const ALLERGY_RANK: Record<AllergyDisplayLevel, number> = {
  none: 0,
  unknown: 1,
  caution: 2,
  hard: 3,
};

function isSaferAllergy(a: ComparisonCandidate, b: ComparisonCandidate): boolean {
  return ALLERGY_RANK[a.allergyLevel] < ALLERGY_RANK[b.allergyLevel];
}

/**
 * 우세를 말할 수 있는 근거만 모은다. 근거가 하나도 없으면 우세라고 말하지 않는다.
 * 점수 차 자체는 근거로 쓰지 않는다 — 사용자가 알고 싶은 것은 "왜" 이기 때문이다.
 */
function buildReasons(winner: ComparisonCandidate, runnerUp: ComparisonCandidate): string[] {
  const reasons: string[] = [];

  if (isSaferAllergy(winner, runnerUp)) {
    reasons.push(
      winner.allergyLevel === 'none'
        ? '알레르기 관련 원료가 확인되지 않았어'
        : '알레르기 관련 신호가 더 약해',
    );
  }

  if (winner.dangerCount < runnerUp.dangerCount) {
    reasons.push(`주의가 필요한 원료가 ${runnerUp.dangerCount - winner.dangerCount}개 적어`);
  } else if (winner.dangerCount === runnerUp.dangerCount && winner.cautionCount < runnerUp.cautionCount) {
    reasons.push(`살펴볼 원료가 ${runnerUp.cautionCount - winner.cautionCount}개 적어`);
  }

  const extraConcerns = winner.matchedConcerns.filter((c) => !runnerUp.matchedConcerns.includes(c));
  if (extraConcerns.length > 0) {
    reasons.push(`${extraConcerns.slice(0, 2).join(', ')} 고민에 더 맞닿아 있어`);
  }

  return reasons;
}

/**
 * 비교 후보들에서 판정을 만든다.
 *
 * - 후보가 2개 미만이면 판정하지 않는다.
 * - 1위와 2위의 점수 차가 MEANINGFUL_SCORE_GAP 미만이면 동점으로 본다.
 * - 점수 차가 충분해도 설명할 근거가 없으면 동점으로 본다.
 *   숫자만 다르고 이유를 못 대는 우열은 사용자에게 도움이 되지 않는다.
 */
export function resolveComparisonVerdict(candidates: ComparisonCandidate[]): ComparisonVerdict {
  if (candidates.length < 2) return { kind: 'none' };

  const ranked = [...candidates].sort(
    (a, b) => b.score - a.score || ALLERGY_RANK[a.allergyLevel] - ALLERGY_RANK[b.allergyLevel],
  );
  const [top, second] = ranked;
  const gap = top.score - second.score;

  if (gap < MEANINGFUL_SCORE_GAP) {
    // 점수가 사실상 같아도 알레르기 신호가 다르면 그건 진짜 차이다.
    if (isSaferAllergy(top, second)) {
      const reasons = buildReasons(top, second);
      if (reasons.length > 0) return { kind: 'winner', winner: top, runnerUp: second, reasons };
    }
    const leaders = ranked.filter((c) => top.score - c.score < MEANINGFUL_SCORE_GAP);
    return { kind: 'tie', leaders };
  }

  const reasons = buildReasons(top, second);
  if (reasons.length === 0) {
    return { kind: 'tie', leaders: [top, second] };
  }
  return { kind: 'winner', winner: top, runnerUp: second, reasons };
}
