import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const legacy = JSON.parse(read('src/data/standard_feed_data.json')) as Array<{
  id: number;
  name_ko: string;
  name_en: string;
  moisture: number;
  protein: number;
  fat: number;
  ash: number;
  fiber: number;
}>;

interface DetailItem {
  id: number;
  name_ko: string;
  name_en: string;
  values: Record<string, Record<string, number>>;
}

const detail = JSON.parse(read('src/data/standard_feed_2022.json')) as {
  source: string;
  basis: string;
  basis_label: string;
  generated_from: string;
  groups: Array<{ key: string; label: string; unit: string; nutrients: Array<{ key: string; basis: string }> }>;
  items: DetailItem[];
};

const normalize = (name: string) => name.replace(/\s+/g, ' ').trim();

describe('한국표준사료성분표 2022 상세 데이터셋', () => {
  it('원본 엑셀과 변환 스크립트를 저장소에 함께 둔다', () => {
    // 수치를 손으로 고치면 어디서 틀어졌는지 되짚을 수 없다. 원본과 스크립트가
    // 함께 있어야 누구든 같은 JSON 을 다시 만들어 대조할 수 있다.
    expect(existsSync(join(process.cwd(), detail.generated_from))).toBe(true);
    expect(existsSync(join(process.cwd(), 'scripts/import-standard-feed-2022.mjs'))).toBe(true);
    expect(detail.source).toContain('2022');
  });

  it('기존 번들 데이터와 같은 원료를 같은 번호로 담는다', () => {
    expect(detail.items).toHaveLength(legacy.length);
    expect(detail.items.map((item) => item.id)).toEqual(legacy.map((row) => row.id));
    expect(detail.items.map((item) => item.name_ko))
      .toEqual(legacy.map((row) => normalize(row.name_ko)));
    expect(new Set(detail.items.map((item) => item.id)).size).toBe(detail.items.length);
  });

  it('기존 5개 수치가 상세 일반성분과 어긋나지 않는다', () => {
    // 같은 원본에서 뽑은 두 파일이 다른 값을 말하면, 화면에서 요약과 상세가 엇갈린다.
    const pairs: Array<[keyof (typeof legacy)[number], string]> = [
      ['moisture', '수분'],
      ['protein', '조단백질'],
      ['fat', '조지방'],
      ['ash', '조회분'],
      ['fiber', 'CF'],
    ];
    for (const [index, row] of legacy.entries()) {
      const composition = detail.items[index].values.composition ?? {};
      for (const [legacyKey, detailKey] of pairs) {
        // 분석 기록이 없어 빠진 영양소는 기존 파일에서 0 으로 채워져 있다.
        expect(Math.abs((composition[detailKey] ?? 0) - Number(row[legacyKey])))
          .toBeLessThanOrEqual(0.011);
      }
    }
  });

  it('모든 수치가 묶음 정의에 선언된 영양소이고 유한한 숫자다', () => {
    const declared = new Map(detail.groups.map((group) => [
      group.key,
      new Set(group.nutrients.map((nutrient) => nutrient.key)),
    ]));
    expect(declared.size).toBe(detail.groups.length);
    for (const group of detail.groups) {
      expect(group.label).not.toBe('');
      expect(group.unit).not.toBe('');
      for (const nutrient of group.nutrients) {
        expect(['as_fed', 'dry_matter']).toContain(nutrient.basis);
      }
    }
    for (const item of detail.items) {
      for (const [groupKey, values] of Object.entries(item.values)) {
        expect(declared.has(groupKey)).toBe(true);
        for (const [nutrientKey, value] of Object.entries(values)) {
          expect(declared.get(groupKey)!.has(nutrientKey)).toBe(true);
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });

  it('원료마다 사람이 알아볼 이름과 최소한의 일반성분을 갖는다', () => {
    for (const item of detail.items) {
      expect(item.name_ko).not.toBe('');
      expect(Object.keys(item.values.composition ?? {}).length).toBeGreaterThan(0);
    }
  });
});
