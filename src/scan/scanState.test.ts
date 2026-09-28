import { describe, expect, it } from 'vitest';

import {
  InvalidScanTransitionError,
  transitionScanState,
} from './scanState';
import type { ScanState } from './types';

describe('transitionScanState', () => {
  it('allows the normal publication path', () => {
    const path: ScanState[] = [
      'draft',
      'uploaded',
      'processing',
      'needs_confirmation',
      'submitted',
      'published',
    ];

    for (let index = 0; index < path.length - 1; index += 1) {
      expect(transitionScanState(path[index], path[index + 1])).toBe(path[index + 1]);
    }
  });

  it('allows a failed extraction to retry from uploaded', () => {
    expect(transitionScanState('failed', 'uploaded')).toBe('uploaded');
  });

  it.each([
    ['published', 'processing'],
    ['cancelled', 'submitted'],
  ] satisfies Array<[ScanState, ScanState]>)(
    'rejects %s -> %s',
    (from, to) => {
      expect(() => transitionScanState(from, to)).toThrow(InvalidScanTransitionError);
    },
  );
});
