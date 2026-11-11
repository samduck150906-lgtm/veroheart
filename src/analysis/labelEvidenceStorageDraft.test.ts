// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { labelReviewDatabase, PRODUCT, ITEMS, observation } from '../../tests/label-review/database';
let db: Awaited<ReturnType<typeof labelReviewDatabase>>;
beforeAll(async () => { db = await labelReviewDatabase(); }, 20000);
afterAll(async () => { await db.close(); });
const review = async () => (await db.query<{result:{revision:string}}>('SELECT admin_get_label_comparison_review($1) result',[PRODUCT])).rows[0].result;
const receipt = async () => (await db.query<{result:Array<{state:string}>}>('SELECT get_public_label_comparison(ARRAY[$1::uuid]) result',[PRODUCT])).rows[0].result;
describe('draft approval/read privileges, synthetic PG only', () => {
  it.each(['anon','authenticated'])('denies private data and approval to %s while preserving public status', async role => {
    await db.exec(`SET ROLE ${role}`);
    await expect(db.query('SELECT * FROM ingredient_label_comparisons')).rejects.toMatchObject({code:'42501'});
    await expect(db.query('SELECT admin_get_label_comparison_review($1)',[PRODUCT])).rejects.toMatchObject({code:'42501'});
    await expect(db.query('SELECT admin_approve_label_comparison($1,$2,$3,$4,$5)',[PRODUCT,'fake',JSON.stringify(ITEMS),JSON.stringify(observation),'forged'])).rejects.toMatchObject({code:'42501'});
    expect((await receipt())[0].state).toBe('absent');
    await db.exec('RESET ROLE');
  });
  it('approves atomically, retains no direct service writes and exposes no private review fields', async () => {
    await db.exec('SET ROLE service_role');
    const current = await review();
    await expect(db.exec('DELETE FROM ingredient_label_comparisons')).rejects.toMatchObject({code:'42501'});
    const approve = () => db.query<{result:{status:string}}>('SELECT admin_approve_label_comparison($1,$2,$3,$4,$5) result',[PRODUCT,current.revision,JSON.stringify(ITEMS),JSON.stringify(observation),'synthetic-admin']);
    expect((await approve()).rows[0].result.status).toBe('approved');
    expect((await approve()).rows[0].result.status).toBe('already_reviewed');
    const data = await receipt(); expect(data[0].state).toBe('verified');
    expect(JSON.stringify(data)).not.toMatch(/fixture:|synthetic-admin|sourceReference|reviewed_by|raw_label|coverageNotes/);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT * FROM admin_audit_log')).rows).toHaveLength(1);
  });
  it('invalidates metadata changes and never publishes hidden product status', async () => {
    await db.exec("UPDATE ingredients SET description='new definition'");
    expect((await receipt())[0].state).toBe('stale');
    await db.exec('UPDATE products SET is_visible=false');
    expect(await receipt()).toEqual([]);
  });
});

it('honors the optional verified-only publication setting for both public roles', async () => {
  await db.exec("UPDATE products SET is_visible=true,verification_status='pending'; CREATE OR REPLACE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT TRUE'");
  for (const role of ['anon','authenticated']) {
    await db.exec(`SET ROLE ${role}`); expect(await receipt()).toEqual([]); await db.exec('RESET ROLE');
  }
  await db.exec("UPDATE products SET verification_status='verified'");
  for (const role of ['anon','authenticated']) {
    await db.exec(`SET ROLE ${role}`); expect(await receipt()).toHaveLength(1); await db.exec('RESET ROLE');
  }
});
