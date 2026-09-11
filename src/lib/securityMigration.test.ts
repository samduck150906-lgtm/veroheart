import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase', 'migrations', '20260911112000_tighten_public_profiles_and_definers.sql'),
  'utf8',
).toLowerCase();

describe('공개 프로필 최소권한 마이그레이션', () => {
  it('전체 회원 공개 정책을 제거하고 리뷰 작성자만 허용한다', () => {
    expect(sql).toContain('drop policy if exists "anyone can view public profile"');
    expect(sql).toContain('review authors have public profiles');
    expect(sql).toContain('from public.reviews as r');
  });

  it('anon에게 공개 프로필 표시 컬럼만 허용한다', () => {
    expect(sql).toContain('revoke select on table public.users from anon');
    expect(sql).toContain('grant select (id, nickname, avatar_url)');
  });

  it('뷰와 definer 함수의 권한 우회를 막는다', () => {
    expect(sql.match(/security_invoker = true/g)?.length).toBe(2);
    expect(sql).toContain("alter function public.handle_new_user() set search_path = ''");
    expect(sql).toContain('revoke all on function public.handle_new_user()');
  });
});
