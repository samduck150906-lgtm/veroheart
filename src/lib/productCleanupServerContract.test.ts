import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function source(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

const edge = source('../../supabase/functions/admin-write/index.ts');
const migration = source('../../supabase/migrations/20260921090000_atomic_product_cleanup.sql');

describe('제품 정리 서버 저장 계약', () => {
  it('관리자 인증 뒤 허용 action만 실행하고 cleanup은 검증된 RPC만 호출한다', () => {
    expect(edge).toContain("return json({ error: '관리자 인증 실패' }, 401, cors)");
    expect(edge.indexOf("관리자 인증 실패")).toBeLessThan(edge.indexOf("case 'applyProductCleanup'"));
    expect(edge).toContain('normalizeProductCleanupItems(body.items)');
    expect(edge).toContain("db.rpc('admin_apply_product_cleanup'");
    expect(edge).not.toContain(".update({ name: item.name, brand_name: item.brand_name })");
  });

  it('행 잠금과 기존값 비교로 동시 수정 충돌을 감지한다', () => {
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('v_current.name <> v_expected_name');
    expect(migration).toContain('v_current.brand_name <> v_expected_brand');
    expect(migration).toContain("'status', 'conflict'");
  });

  it('존재하지 않는 제품과 재전송을 구분해 안전하게 반환한다', () => {
    expect(migration).toContain("v_status := 'not_found'");
    expect(migration).toContain("'status', 'already_applied'");
    expect(migration.indexOf("'already_applied'")).toBeLessThan(migration.indexOf('v_current.name <> v_expected_name'));
  });

  it('제품 행 전체가 아니라 허용된 두 필드만 갱신한다', () => {
    const update = migration.slice(migration.indexOf('UPDATE public.products'), migration.indexOf('INSERT INTO public.admin_audit_log'));
    expect(update).toContain('SET name =');
    expect(update).toContain('brand_name =');
    for (const forbidden of ['barcode', 'kcal_per_100g', 'packaging_weight_g', 'product_health_concerns']) {
      expect(update).not.toContain(forbidden);
    }
  });

  it('중복을 차단하고 변경 전후·변경 필드를 감사 로그에 원자적으로 기록한다', () => {
    expect(migration).toContain("'status', 'duplicate'");
    expect(migration).toContain("'before', jsonb_build_object");
    expect(migration).toContain("'after', jsonb_build_object");
    expect(migration).toContain("'changedFields'");
    expect(migration).toContain('EXCEPTION WHEN OTHERS');
    expect(migration.indexOf('UPDATE public.products')).toBeLessThan(migration.indexOf('INSERT INTO public.admin_audit_log'));
  });

  it('함수 호출 권한을 service_role로 제한한다', () => {
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) FROM anon');
    expect(migration).toContain('FROM authenticated');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.admin_apply_product_cleanup(JSONB, TEXT) TO service_role');
  });
});
