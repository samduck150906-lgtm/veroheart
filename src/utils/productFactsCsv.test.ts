import { describe, expect, it } from 'vitest';
import { parseCsv, parseProductFactsCsv, toProductFactsCsv } from './productFactsCsv';
import { NUTRITION_KEYS, type NutritionKey, type ProductFactsRow } from '../lib/adminApi';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

function nutrition(values: Partial<Record<NutritionKey, number>> = {}): Record<NutritionKey, number | null> {
  return Object.fromEntries(
    NUTRITION_KEYS.map((key) => [key, values[key] ?? null]),
  ) as Record<NutritionKey, number | null>;
}

function row(overrides: Partial<ProductFactsRow> = {}): ProductFactsRow {
  return {
    id: ID_A,
    name: '오리젠 오리지널',
    brandName: '오리젠',
    imageUrl: null,
    sourceUrl: null,
    barcode: null,
    kcalPer100g: null,
    nutrition: nutrition(),
    hasNutrition: false,
    ...overrides,
  };
}

/**
 * 제품명에 쉼표가 들어 있는 경우가 많다(쿠팡 제목에서 온 이름). 인용을 잘못
 * 다루면 열이 밀려서 엉뚱한 제품에 바코드가 붙는다 — 이 파일에서 가장 중요한
 * 검사다.
 */
describe('바코드·보장성분 CSV', () => {
  describe('인용 규칙', () => {
    it('쉼표가 든 값을 인용해 내보내고 그대로 읽어 온다', () => {
      const csv = toProductFactsCsv([row({ name: '강아지 사료, 1kg, 연어맛' })]);
      const table = parseCsv(csv);
      expect(table[1][1]).toBe('강아지 사료, 1kg, 연어맛');
      expect(table[1][0]).toBe(ID_A);
    });

    it('큰따옴표가 든 값을 두 번 써서 보존한다', () => {
      const csv = toProductFactsCsv([row({ name: '프리미엄 "특별" 사료' })]);
      expect(parseCsv(csv)[1][1]).toBe('프리미엄 "특별" 사료');
    });

    it('줄바꿈이 든 값도 한 칸으로 읽는다', () => {
      expect(parseCsv('a,b\r\n"1\n2",3')[1][0]).toBe('1\n2');
    });

    it('엑셀 BOM 과 CRLF 를 흡수한다', () => {
      const table = parseCsv('﻿a,b\r\n1,2\r\n');
      expect(table).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('마지막 줄에 줄바꿈이 없어도 읽는다', () => {
      expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    });
  });

  describe('왕복', () => {
    it('내보낸 CSV 를 그대로 다시 읽으면 값이 유지된다', () => {
      const original = row({
        barcode: '4006381333931',
        kcalPer100g: 380,
        nutrition: nutrition({ crude_protein: 32.5, crude_fat: 18, moisture: 10 }),
      });
      const parsed = parseProductFactsCsv(toProductFactsCsv([original]), new Set([ID_A]));
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows[0].barcode).toBe('4006381333931');
      expect(parsed.rows[0].kcalPer100g).toBe(380);
      expect(parsed.rows[0].nutrition.crude_protein).toBe(32.5);
      expect(parsed.rows[0].nutrition.crude_fat).toBe(18);
      expect(parsed.rows[0].nutrition.calcium).toBeNull();
    });

    it('빈 칸은 미입력으로 둔다', () => {
      const parsed = parseProductFactsCsv(toProductFactsCsv([row()]), new Set([ID_A]));
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows[0].barcode).toBeNull();
      expect(parsed.rows[0].kcalPer100g).toBeNull();
    });
  });

  describe('검증', () => {
    const header = '제품ID,제품명,브랜드,바코드,100g당kcal,조단백,조지방,조섬유,조회분,수분,칼슘,인';

    it('체크숫자가 틀린 바코드를 줄 번호와 함께 잡는다', () => {
      const parsed = parseProductFactsCsv(
        `${header}\n${ID_A},사료,브랜드,4006381333932,,,,,,,,`,
        new Set([ID_A]),
      );
      expect(parsed.errors[0]).toContain('2행');
      expect(parsed.errors[0]).toContain('체크숫자');
      expect(parsed.rows).toHaveLength(0);
    });

    it('범위를 벗어난 보장성분을 잡는다', () => {
      const parsed = parseProductFactsCsv(
        `${header}\n${ID_A},사료,브랜드,,,150,,,,,,`,
        new Set([ID_A]),
      );
      expect(parsed.errors[0]).toContain('조단백');
    });

    it('% 기호가 붙어 있어도 숫자로 읽는다', () => {
      const parsed = parseProductFactsCsv(
        `${header}\n${ID_A},사료,브랜드,,,"32.5%",,,,,,`,
        new Set([ID_A]),
      );
      expect(parsed.errors).toEqual([]);
      expect(parsed.rows[0].nutrition.crude_protein).toBe(32.5);
    });

    it('목록에 없는 제품ID 를 막는다', () => {
      const parsed = parseProductFactsCsv(
        `${header}\n${ID_B},사료,브랜드,,,,,,,,,`,
        new Set([ID_A]),
      );
      expect(parsed.errors[0]).toContain('목록에 없는');
      expect(parsed.rows).toHaveLength(0);
    });

    it('같은 제품이 두 줄에 있으면 막는다', () => {
      const parsed = parseProductFactsCsv(
        `${header}\n${ID_A},사료,브랜드,,,,,,,,,\n${ID_A},사료,브랜드,,,,,,,,,`,
        new Set([ID_A]),
      );
      expect(parsed.errors[0]).toContain('중복');
      expect(parsed.rows).toHaveLength(1);
    });

    it('엉뚱한 파일을 올리면 첫 열로 알아챈다', () => {
      const parsed = parseProductFactsCsv('이름,전화번호\n홍길동,010');
      expect(parsed.errors[0]).toContain('제품ID');
      expect(parsed.rows).toHaveLength(0);
    });

    it('빈 파일과 머리글만 있는 파일을 구분해 알려 준다', () => {
      expect(parseProductFactsCsv('').errors[0]).toContain('빈 파일');
      expect(parseProductFactsCsv(header).errors[0]).toContain('내용이 없습니다');
    });
  });
});
