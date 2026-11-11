// Synthetic minimal PostgreSQL fixture, never an operating connection/full schema.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const PRODUCT = '00000000-0000-4000-8000-000000000001';
export const LABEL = '00000000-0000-4000-8000-000000000002';
export const ITEMS = ['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
export const observation = { identityConfirmed:true, wholeLabelCompared:true, sourceReference:'fixture:package-image-v1', identityNotes:'Synthetic exact package/weight/flavour reviewed', coverageNotes:'Entire synthetic label compared, including repeated/compound tokens' };
export async function labelReviewDatabase() {
  const db = new PGlite();
  await db.exec(readFileSync('tests/label-review/schema.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261110100000_ingredient_label_comparison_evidence.sql','utf8'));
  return db;
}
