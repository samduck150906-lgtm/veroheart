import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 사용자 화면에 운영자용 내부 용어가 새어 나오지 않는지 검사한다.
 *
 * 제품 상세는 `verification_status` 를 그대로 옮겨 '검수 대기' 배지를 띄우고 있었다.
 * 운영 DB 에서 verified 인 제품이 0건이라 사실상 모든 제품에 붙어 있었고,
 * 보호자에게는 뜻도 할 일도 알 수 없는 내부 상태였다.
 *
 * 관리자 콘솔(pages/admin)은 이런 용어를 써야 하는 화면이므로 검사 대상이 아니다.
 */
const USER_FACING_DIRS = ['src/pages', 'src/components'];
const ADMIN_DIR_MARKER = `${'admin'}/`;

/** 사용자에게 노출되면 안 되는 표현. */
const FORBIDDEN = ['검수', '쿠팡', 'unmatched', 'canonical'];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'admin') continue;
      out.push(...collectFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/**
 * 사용자가 실제로 볼 수 있는 문자열만 뽑는다 — 따옴표 문자열과 JSX 텍스트.
 *
 * 식별자(예: canonicalGradeFromScore)는 화면에 나오지 않으므로 대상이 아니고,
 * 주석은 옛 동작을 설명할 수 있으므로 함께 제외한다.
 */
function visibleStrings(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');

  const out: string[] = [];
  for (const match of withoutComments.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g)) {
    out.push(match[0].slice(1, -1));
  }
  // JSX 텍스트 노드 (>텍스트<)
  for (const match of withoutComments.matchAll(/>([^<>{}]+)</g)) {
    out.push(match[1]);
  }
  return out;
}

describe('사용자 화면 내부 용어 노출', () => {
  const files = USER_FACING_DIRS.flatMap(collectFiles);

  it('검사 대상 화면을 실제로 찾는다', () => {
    // 정규식이 헛돌아 0건을 검사하고 통과하는 상황을 먼저 막는다.
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.includes(ADMIN_DIR_MARKER))).toBe(false);
  });

  it('운영자용 내부 용어가 사용자 화면 코드에 남아 있지 않다', () => {
    const hits: string[] = [];
    for (const file of files) {
      for (const text of visibleStrings(readFileSync(file, 'utf8'))) {
        for (const term of FORBIDDEN) {
          if (text.includes(term)) hits.push(`${file}: ${text.trim().slice(0, 110)}`);
        }
      }
    }
    expect(hits, `내부 용어가 사용자 화면에 남아 있다:\n${hits.join('\n')}`).toEqual([]);
  });
});
