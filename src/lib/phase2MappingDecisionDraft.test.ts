import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const draftPath = resolve(
  process.cwd(),
  'docs/phase2-canonical-mapping-decisions-draft-2026-07-11.md',
);
const draft = readFileSync(draftPath, 'utf8');

const normalizedKeys = [
  '건조비트펄프',
  '오메가3지방산',
  '감자전분',
  '건조맥주효모',
  '녹차추출물',
  '닭간',
  '닭간분말',
  '닭연골',
  '닭지방',
  '동물성지방',
  '맥주효모',
  '비타민e',
  '비트펄프',
  '소르빈산칼륨',
  '오메가6지방산',
  '증점다당류',
  '천연색소',
  '코코넛오일',
  '타피오카전분',
  '토마토박',
  '프락토올리고당',
  '프로필렌글리콜',
  '향미증진제',
  '혼합토코페롤',
] as const;

const decisionValues = [
  'APPROVE_ALIAS',
  'SEPARATE_CANONICAL',
  'MANUAL_REVIEW',
  'REJECT_MAPPING',
  'NEEDS_EVIDENCE',
] as const;

const reviewStatuses = ['todo', 'reviewing', 'approved', 'blocked'] as const;

describe('Phase 2-2.5 mapping decision draft', () => {
  it('exists as a repository document', () => {
    expect(existsSync(draftPath)).toBe(true);
  });

  it('contains all 24 normalized-key candidate keys', () => {
    for (const key of normalizedKeys) {
      expect(draft).toContain(key);
    }
  });

  it('records the dry-run review-required result and substring risk count', () => {
    expect(draft).toContain('DRYRUN_REVIEW_REQUIRED');
    expect(draft).toContain('dangerous_substring_pair_count');
    expect(draft).toContain('487');
  });

  it('prohibits substring-only automatic matching', () => {
    expect(draft).toMatch(/Substring-only automatic matching is prohibited/i);
    expect(draft).toMatch(/review flag/i);
  });

  it('contains every decision enum and review status', () => {
    for (const decision of decisionValues) {
      expect(draft).toContain(decision);
    }
    for (const status of reviewStatuses) {
      expect(draft).toContain(status);
    }
  });

  it('states the draft does not authorize database writes, migrations, or operating Supabase SQL execution', () => {
    expect(draft).toMatch(/does not authorize database writes/i);
    expect(draft).toMatch(/not a migration file/i);
    expect(draft).toMatch(/No operating Supabase SQL execution is required or authorized/i);
  });

  it('keeps todo, reviewing, and blocked rows out of migration candidates', () => {
    expect(draft).toMatch(
      /Rows with `review_status=todo`, `review_status=reviewing`, or `review_status=blocked` are not migration candidates\./,
    );
    expect(draft).toMatch(/review_status=approved/);
    expect(draft).toMatch(/sandbox rehearsal/i);
    expect(draft).toMatch(/backup\/PITR/i);
    expect(draft).toMatch(/explicit approval/i);
  });
});
