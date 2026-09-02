import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Helmet 의 <title> 은 문자열 자식 하나만 받는다.
 *
 * `<title>{product.name} - 베로로</title>` 처럼 표현식과 문자열을 나란히 두면
 * 자식이 둘이 되어 react-helmet-async 가 Invariant Violation 을 던지고, 그 페이지가
 * 통째로 ErrorBoundary 로 떨어진다. 실제로 제품 상세·성분 분석 결과·브랜드·이벤트
 * 네 화면이 이 이유로 "잠시 문제가 발생했어요" 만 보여주고 있었다.
 *
 * 템플릿 리터럴 하나로 감싸면 자식이 하나가 된다.
 */
function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { out.push(...collect(full)); continue; }
    if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

describe('Helmet <title>', () => {
  const files = collect('src');
  const titles = files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => ({ file, inner: m[1] })),
  );

  it('검사할 <title> 을 실제로 찾는다', () => {
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });

  it('자식이 항상 하나다 — 표현식과 문자열을 섞지 않는다', () => {
    const bad = titles
      .filter(({ inner }) => {
        const trimmed = inner.trim();
        if (!trimmed.includes('{')) return false; // 순수 문자열 제목은 안전하다
        // 표현식 하나로만 이루어져야 한다: {…} 가 전체를 덮는지 본다.
        if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return true;
        let depth = 0;
        for (let i = 0; i < trimmed.length; i += 1) {
          if (trimmed[i] === '{') depth += 1;
          if (trimmed[i] === '}') depth -= 1;
          if (depth === 0 && i < trimmed.length - 1) return true; // 중간에 닫히면 뒤에 문자열이 붙은 것
        }
        return false;
      })
      .map(({ file, inner }) => `${file}: <title>${inner.trim()}</title>`);

    expect(bad, `Helmet <title> 자식이 둘 이상이다:\n${bad.join('\n')}`).toEqual([]);
  });
});
