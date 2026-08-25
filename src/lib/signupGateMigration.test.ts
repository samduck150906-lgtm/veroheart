/**
 * 계약 테스트 — 가입 차단 트리거 마이그레이션.
 *
 * signup_enabled 스위치는 예전에 프론트에만 걸려 있어, anon 키로 signUp 을 직접
 * 호출하면 그대로 계정이 만들어졌다. 서버측 차단을 DB 트리거로 옮겼으므로,
 * 그 트리거가 갖춰야 할 성질을 여기서 고정한다.
 *
 * 이 테스트는 SQL 을 실행하지 않는다(운영 DB 없이 돌아야 한다). 마이그레이션이
 * 나중에 손질될 때 안전 성질이 조용히 빠지는 것을 막는 것이 목적이다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260825120000_enforce_signup_enabled.sql',
);

const sql = readFileSync(MIGRATION_PATH, 'utf8');

/** 주석을 걷어낸 실행 SQL만 남긴다 */
const executable = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

describe('가입 차단 트리거 마이그레이션', () => {
  it('auth.users 의 INSERT 앞단에 건다', () => {
    // 로그인은 auth.users 를 INSERT 하지 않으므로, INSERT 에만 걸어야
    // 기존 사용자 로그인이 막히지 않는다.
    expect(executable).toMatch(/BEFORE\s+INSERT\s+ON\s+auth\.users/i);
    expect(executable).not.toMatch(/BEFORE\s+(UPDATE|DELETE)\s+ON\s+auth\.users/i);
    expect(executable).not.toMatch(/AFTER\s+INSERT\s+ON\s+auth\.users/i);
  });

  it('재실행해도 안전하다(idempotent)', () => {
    expect(executable).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.enforce_signup_enabled/i);
    expect(executable).toMatch(/DROP\s+TRIGGER\s+IF\s+EXISTS\s+on_auth_user_signup_gate/i);
  });

  it('app_settings.signup_enabled 를 근거로 판단한다', () => {
    expect(executable).toMatch(/FROM\s+public\.app_settings/i);
    expect(executable).toMatch(/key\s*=\s*'signup_enabled'/i);
  });

  it('설정이 없으면 가입을 허용한다(fail-open)', () => {
    // 설정 행이 유실됐다고 가입이 통째로 막혀 서비스가 멈추면 안 된다.
    // 명시적으로 false 일 때만 막는다.
    expect(executable).toMatch(/IF\s+v_enabled\s+IS\s+NULL\s+THEN\s+RETURN\s+NEW;/is);
  });

  it('false 일 때만 거부하고, 문자열 false 도 함께 막는다', () => {
    expect(executable).toMatch(/v_enabled\s*=\s*'false'::jsonb/i);
    expect(executable).toMatch(/v_enabled\s*=\s*'"false"'::jsonb/i);
    expect(executable).toMatch(/RAISE\s+EXCEPTION\s+'signup_disabled'/i);
  });

  it('SECURITY DEFINER 와 고정 search_path 로 정의한다', () => {
    // app_settings 는 RLS 가 걸려 있어 호출자 권한으로는 읽지 못한다.
    // SECURITY DEFINER 를 쓰는 함수는 search_path 를 고정해야 안전하다.
    expect(executable).toMatch(/SECURITY\s+DEFINER/i);
    expect(executable).toMatch(/SET\s+search_path\s*=\s*public/i);
  });

  it('가입 차단 외의 데이터를 건드리지 않는다', () => {
    // 이 트리거는 판단만 한다. 다른 테이블에 쓰기 시작하면 가입 경로 전체가
    // 그 테이블 상태에 묶인다.
    expect(executable).not.toMatch(/\b(INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM)\b/i);
  });
});

describe('앱이 서버 차단 응답을 사용자 문구로 바꾼다', () => {
  it('Login 화면이 signup_disabled 를 안내 문구로 매핑한다', () => {
    // 트리거가 올린 예외는 GoTrue 를 거쳐 원문 그대로 내려온다.
    // 사용자에게 raw 에러를 보여주지 않도록 매핑이 남아 있어야 한다.
    const login = readFileSync(resolve(process.cwd(), 'src/pages/Login.tsx'), 'utf8');
    expect(login).toContain('signup_disabled');
    expect(login).toContain('신규 회원 가입이 일시 중단되었습니다');
  });
});
