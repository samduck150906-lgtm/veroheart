import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src', 'lib', 'supabase.ts'), 'utf8');

describe('모바일 초기 제품 조회', () => {
  it('고정 크기 서버 페이지를 사용한다', () => {
    const start = source.indexOf('export async function getProductsPage');
    const end = source.indexOf('export async function getProductDetail', start);
    const body = source.slice(start, end);
    expect(body).toContain('.range(from, from + safePageSize - 1)');
    expect(body).toContain(".order('created_at', { ascending: false })");
  });

  it('초기 페이지에서는 원재료 중첩 행을 받지 않는다', () => {
    const start = source.indexOf('export async function getProductsPage');
    const end = source.indexOf('export async function getProducts()', start);
    expect(source.slice(start, end)).not.toContain('product_ingredients (');
  });
});
