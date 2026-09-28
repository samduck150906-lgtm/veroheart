import type { ScanState } from './types';

const ALLOWED: Record<ScanState, ScanState[]> = {
  draft: ['uploaded', 'cancelled'],
  uploaded: ['processing', 'cancelled'],
  processing: ['needs_confirmation', 'failed'],
  needs_confirmation: ['submitted', 'uploaded', 'cancelled'],
  submitted: ['published', 'needs_review', 'rejected'],
  published: [],
  needs_review: ['published', 'rejected'],
  failed: ['uploaded', 'cancelled'],
  cancelled: [],
  rejected: [],
};

export class InvalidScanTransitionError extends Error {
  readonly from: ScanState;
  readonly to: ScanState;

  constructor(from: ScanState, to: ScanState) {
    super(`Invalid scan transition: ${from} -> ${to}`);
    this.name = 'InvalidScanTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function transitionScanState(from: ScanState, to: ScanState): ScanState {
  if (!ALLOWED[from].includes(to)) throw new InvalidScanTransitionError(from, to);
  return to;
}
