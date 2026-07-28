/**
 * admin-write Edge Function 의 서버 측 검증 규칙 회귀 테스트.
 * (Deno 런타임 없이 검증 로직만 순수 import 해서 확인한다)
 */
import { describe, it, expect } from 'vitest';
import {
  ALLOWED_ACTIONS,
  ValidationError,
  actorFromToken,
  clampPage,
  clampPageSize,
  decodeBase64,
  detectImage,
  escapeLike,
  normalizeIngredientPayload,
  normalizeProductIngredientItems,
  normalizeProductPayload,
  normalizeSettingsPayload,
} from '../../supabase/functions/admin-write/validation.ts';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('admin-write: 성분 payload 검증', () => {
  it('신규 등록 payload 를 정규화한다', () => {
    const out = normalizeIngredientPayload({
      name_ko: '  닭고기  ',
      name_en: 'Chicken',
      risk_level: 'safe',
      description: '  단백질원  ',
      category: '단백질원',
    });
    expect(out).toMatchObject({
      name_ko: '닭고기',
      name_en: 'Chicken',
      risk_level: 'safe',
      description: '단백질원',
      category: '단백질원',
    });
  });

  it('빈 name_ko 를 거부한다', () => {
    expect(() => normalizeIngredientPayload({ name_ko: '   ', risk_level: 'safe' })).toThrow(ValidationError);
  });

  it('허용되지 않은 컬럼을 payload 에서 제거한다', () => {
    const out = normalizeIngredientPayload({
      name_ko: '닭고기',
      risk_level: 'safe',
      // 아래는 전부 화이트리스트 밖 — 저장돼선 안 된다
      id: 'should-not-pass',
      created_at: '2020-01-01',
      is_admin: true,
      'name_ko; DROP TABLE ingredients': 'x',
    });
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('created_at');
    expect(out).not.toHaveProperty('is_admin');
    expect(Object.keys(out).sort()).toEqual(['category', 'description', 'name_en', 'name_ko', 'risk_level']);
  });

  it('허용되지 않은 위험도 값을 거부한다', () => {
    expect(() => normalizeIngredientPayload({ name_ko: '닭고기', risk_level: 'lethal' })).toThrow(ValidationError);
  });

  it('너무 긴 이름을 거부한다', () => {
    expect(() =>
      normalizeIngredientPayload({ name_ko: 'ㄱ'.repeat(201), risk_level: 'safe' }),
    ).toThrow(ValidationError);
  });

  it('배열 필드가 배열이 아니면 거부한다', () => {
    expect(() =>
      normalizeIngredientPayload({ name_ko: '닭고기', risk_level: 'safe', allergy_triggers: 'chicken' }),
    ).toThrow(ValidationError);
  });
});

describe('admin-write: 제품 payload 검증', () => {
  it('제품명·브랜드는 필수다', () => {
    expect(() => normalizeProductPayload({ name: '', brand_name: '베로로' })).toThrow(ValidationError);
    expect(() => normalizeProductPayload({ name: '사료', brand_name: '  ' })).toThrow(ValidationError);
  });

  it('화이트리스트 밖 컬럼을 제거한다', () => {
    const out = normalizeProductPayload({
      name: '테스트 사료',
      brand_name: '베로로',
      avg_rating: 5,
      review_count: 999,
      created_at: '2020-01-01',
    });
    expect(out).not.toHaveProperty('avg_rating');
    expect(out).not.toHaveProperty('review_count');
    expect(out).not.toHaveProperty('created_at');
  });
});

describe('admin-write: 제품 원재료 연결 검증', () => {
  it('정상 목록을 정규화한다', () => {
    const items = normalizeProductIngredientItems([
      { ingredient_id: UUID_A, sort_order: 0 },
      { ingredientId: UUID_B, sortOrder: 1 },
    ]);
    expect(items).toEqual([
      { ingredient_id: UUID_A, sort_order: 0 },
      { ingredient_id: UUID_B, sort_order: 1 },
    ]);
  });

  it('같은 성분의 중복 연결을 거부한다', () => {
    expect(() =>
      normalizeProductIngredientItems([{ ingredient_id: UUID_A }, { ingredient_id: UUID_A }]),
    ).toThrow(ValidationError);
  });

  it('잘못된 ingredient_id 를 거부한다', () => {
    expect(() => normalizeProductIngredientItems([{ ingredient_id: 'not-a-uuid' }])).toThrow(ValidationError);
    expect(() => normalizeProductIngredientItems([{}])).toThrow(ValidationError);
  });

  it('배열이 아니면 거부한다', () => {
    expect(() => normalizeProductIngredientItems({ ingredient_id: UUID_A })).toThrow(ValidationError);
  });

  it('연결 개수 상한을 넘기면 거부한다', () => {
    const many = Array.from({ length: 201 }, () => ({ ingredient_id: UUID_A }));
    expect(() => normalizeProductIngredientItems(many)).toThrow(ValidationError);
  });
});

describe('admin-write: 시스템 설정 검증', () => {
  it('허용된 키를 저장한다', () => {
    const entries = normalizeSettingsPayload({ maintenance_mode: true, signup_enabled: false });
    expect(entries).toEqual([
      ['maintenance_mode', true],
      ['signup_enabled', false],
    ]);
  });

  it('허용되지 않은 임의 키를 거부한다', () => {
    expect(() => normalizeSettingsPayload({ service_role_key: 'leak' })).toThrow(ValidationError);
    expect(() => normalizeSettingsPayload({ maintenance_mode: true, evil: 1 })).toThrow(ValidationError);
  });

  it('빈 설정을 거부한다', () => {
    expect(() => normalizeSettingsPayload({})).toThrow(ValidationError);
  });

  it('과도하게 큰 값을 거부한다', () => {
    expect(() => normalizeSettingsPayload({ service_notice: { message: 'x'.repeat(5000) } })).toThrow(
      ValidationError,
    );
  });
});

describe('admin-write: 이미지 검증', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

  it('매직 바이트로 포맷을 판별한다', () => {
    expect(detectImage(jpeg)).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(detectImage(png)).toEqual({ mime: 'image/png', ext: 'png' });
    expect(detectImage(webp)).toEqual({ mime: 'image/webp', ext: 'webp' });
  });

  it('확장자를 믿지 않고 실제 내용이 이미지가 아니면 거부한다 (SVG·스크립트 차단)', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(() => detectImage(svg)).toThrow(ValidationError);
  });

  it('너무 짧은 데이터를 거부한다', () => {
    expect(() => detectImage(new Uint8Array([0xff, 0xd8]))).toThrow(ValidationError);
  });

  it('data URL 접두사를 허용하고 base64 를 디코드한다', () => {
    const bytes = decodeBase64('data:image/png;base64,/9j/');
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('빈 입력을 거부한다', () => {
    expect(() => decodeBase64('')).toThrow(ValidationError);
    expect(() => decodeBase64(null)).toThrow(ValidationError);
  });
});

describe('admin-write: 기타 유틸', () => {
  it('감사 로그용 actor 는 아이디만 담고 비밀번호는 담지 않는다', () => {
    const token = btoa('rumi:super-secret-password');
    expect(actorFromToken(token)).toBe('rumi');
    expect(actorFromToken(token)).not.toContain('super-secret-password');
  });

  it('잘못된 토큰이면 unknown 을 반환한다', () => {
    expect(actorFromToken('###')).toBe('unknown');
  });

  it('페이지 파라미터를 안전한 범위로 제한한다', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-5)).toBe(1);
    expect(clampPage('3')).toBe(3);
    expect(clampPageSize(1000)).toBe(100);
    expect(clampPageSize(0)).toBe(20);
  });

  it('ilike 메타문자를 이스케이프한다', () => {
    expect(escapeLike('100%_x')).toBe('100\\%\\_x');
  });

  it('허용 action 목록에 알 수 없는 action 이 없다', () => {
    expect(ALLOWED_ACTIONS.has('saveIngredient')).toBe(true);
    expect(ALLOWED_ACTIONS.has('deleteIngredient')).toBe(true);
    expect(ALLOWED_ACTIONS.has('dropTable')).toBe(false);
  });
});
