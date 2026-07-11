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

const approvedLowRiskAliasRows = [
  ['MAP-DRAFT-001', '건조비트펄프'],
  ['MAP-DRAFT-002', '오메가3지방산'],
  ['MAP-DRAFT-003', '감자전분'],
  ['MAP-DRAFT-004', '건조맥주효모'],
  ['MAP-DRAFT-005', '녹차추출물'],
  ['MAP-DRAFT-011', '맥주효모'],
  ['MAP-DRAFT-012', '비타민e'],
  ['MAP-DRAFT-013', '비트펄프'],
  ['MAP-DRAFT-015', '오메가6지방산'],
  ['MAP-DRAFT-018', '코코넛오일'],
  ['MAP-DRAFT-019', '타피오카전분'],
  ['MAP-DRAFT-020', '토마토박'],
  ['MAP-DRAFT-021', '프락토올리고당'],
  ['MAP-DRAFT-024', '혼합토코페롤'],
] as const;

const excludedAliasRows = [
  ['MAP-DRAFT-006', '닭간'],
  ['MAP-DRAFT-007', '닭간분말'],
  ['MAP-DRAFT-008', '닭연골'],
  ['MAP-DRAFT-009', '닭지방'],
  ['MAP-DRAFT-010', '동물성지방'],
  ['MAP-DRAFT-014', '소르빈산칼륨'],
  ['MAP-DRAFT-016', '증점다당류'],
  ['MAP-DRAFT-017', '천연색소'],
  ['MAP-DRAFT-022', '프로필렌글리콜'],
  ['MAP-DRAFT-023', '향미증진제'],
] as const;

function tableRow(reviewId: string) {
  const row = draft
    .split('\n')
    .find((line) => line.startsWith(`| ${reviewId} |`));

  expect(row, `missing row for ${reviewId}`).toBeDefined();
  return row ?? '';
}

function rowStatus(reviewId: string) {
  const cells = tableRow(reviewId)
    .split('|')
    .map((cell) => cell.trim());

  return cells[12];
}

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

  it('marks exactly the approved low-risk alias candidates as approved', () => {
    for (const [reviewId, key] of approvedLowRiskAliasRows) {
      expect(tableRow(reviewId)).toContain(key);
      expect(rowStatus(reviewId)).toBe('approved');
    }
  });

  it('keeps animal, allergen, additive, preservative, colorant, and risk-related candidates unapproved', () => {
    for (const [reviewId, key] of excludedAliasRows) {
      expect(tableRow(reviewId)).toContain(key);
      expect(rowStatus(reviewId)).not.toBe('approved');
    }
  });

  it('keeps global substring and risk policy rows blocked where required', () => {
    expect(rowStatus('MAP-DRAFT-SUBSTRING-GLOBAL')).toBe('blocked');
    expect(rowStatus('MAP-DRAFT-RISK-DANGER')).toBe('blocked');
    expect(rowStatus('MAP-DRAFT-RISK-CAUTION')).toBe('blocked');
    expect(rowStatus('MAP-DRAFT-ADDITIVES')).toBe('blocked');
  });

  it('states approved rows are sandbox rehearsal candidates, not production migration approval', () => {
    expect(draft).toMatch(/approved.*sandbox rehearsal candidates only/i);
    expect(draft).toMatch(/not production migration approval/i);
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
