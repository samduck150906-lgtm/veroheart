/**
 * PostgREST 필터 값 이스케이프 헬퍼.
 *
 * - or() 그룹 안의 값에 쉼표·괄호가 있으면 조건 구분자로 해석돼 쿼리 전체가
 *   400으로 깨진다 → 큰따옴표 인용 + 따옴표/역슬래시 이스케이프.
 * - ilike 패턴의 %/_ 는 와일드카드라서 리터럴 비교가 필요하면 이스케이프해야
 *   한다(Postgres LIKE 기본 이스케이프 문자는 역슬래시).
 */

/** or() 그룹 안에서 안전한 부분일치(ilike) 패턴: `"%값%"` */
export function toOrIlikePattern(raw: string): string {
  const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

/**
 * 대소문자 무시 '정확 일치'용 ilike 패턴.
 * 와일드카드(%/_)와 역슬래시를 이스케이프해 입력 문자열 그대로를 비교한다.
 * (직접 입력 제품명 "Churu"/"churu"를 같은 제품으로 묶기 위해 eq 대신 사용)
 */
export function toExactIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
