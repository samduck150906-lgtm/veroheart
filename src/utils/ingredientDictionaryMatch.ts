/**
 * 라벨에서 뽑은 원재료 이름 ↔ 성분 사전 대조.
 *
 * 정확히 일치하는 것만 잇는다. 비슷한 이름을 골라 주면 관리자는 확인했다고
 * 생각하고 넘어가는데, 이 연결이 곧 알레르기·위험성분 판정의 근거가 된다.
 * 못 찾은 이름은 못 찾았다고 돌려주고, 사전에 등록할지는 사람이 정한다.
 *
 * 표기 흔들림(띄어쓰기·가운뎃점·대소문자)만 흡수한다. '닭 고기'와 '닭고기'는
 * 같은 말이지만 '닭고기'와 '닭고기분말'은 다른 원료다.
 */

export interface DictionaryName {
  nameKo: string;
  nameEn?: string | null;
  aliases?: string[] | null;
}

export interface IngredientMatch<T> {
  /** 라벨에 적혀 있던 이름 그대로 — 어떤 표기가 무엇에 붙었는지 보여 준다. */
  name: string;
  entry: T;
}

export interface IngredientMatchResult<T> {
  matched: IngredientMatch<T>[];
  unmatched: string[];
}

/** 대조용 표준형. 붙여 쓰든 띄어 쓰든 같은 열쇠가 되게 한다. */
export function normalizeIngredientName(value: string): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\s·・.,'"`-]/g, '')
    .trim();
}

function keysOf(entry: DictionaryName): string[] {
  const names = [entry.nameKo, entry.nameEn ?? '', ...(entry.aliases ?? [])];
  return names.map(normalizeIngredientName).filter(Boolean);
}

/**
 * 이름 목록을 사전에 대조한다. 입력 순서를 그대로 지킨다 — 원재료 표기 순서가
 * 분석 엔진의 '제1원료' 판정에 쓰이기 때문이다.
 */
export function matchIngredientNames<T extends DictionaryName>(
  names: string[],
  dictionary: T[],
): IngredientMatchResult<T> {
  const byKey = new Map<string, T>();
  for (const entry of dictionary) {
    for (const key of keysOf(entry)) {
      // 먼저 등록된 쪽을 남긴다. 별칭이 다른 성분의 정식 명칭을 덮어쓰면
      // 이름은 맞는데 엉뚱한 성분에 연결된다.
      if (!byKey.has(key)) byKey.set(key, entry);
    }
  }

  const matched: IngredientMatch<T>[] = [];
  const unmatched: string[] = [];
  const used = new Set<T>();

  for (const name of names) {
    const entry = byKey.get(normalizeIngredientName(name));
    if (!entry) {
      unmatched.push(name);
      continue;
    }
    // 같은 성분을 두 번 잇지 않는다(‘닭고기’와 ‘닭 고기’가 함께 적힌 라벨).
    if (used.has(entry)) continue;
    used.add(entry);
    matched.push({ name, entry });
  }

  return { matched, unmatched };
}
