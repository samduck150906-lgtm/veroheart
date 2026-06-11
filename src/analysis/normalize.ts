/**
 * 성분명 표준화(정규화) 계층.
 *
 * 라벨 표기는 띄어쓰기/괄호/표기변형이 많다("닭 고기", "치킨(닭고기)", "Chicken").
 * 사전 매칭 전에 한 번 정규화해서 비교 정확도를 높인다.
 */

/**
 * 성분명을 매칭 비교용 키로 정규화한다.
 * - 소문자화, 공백 제거, 괄호/대괄호 제거
 * - "가루/파우더" → "분말"로 통일
 * - 선행/후행 기호 제거
 */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[()（）[\]{}]/g, '')
    .replace(/가루|파우더/g, '분말')
    .replace(/[*·•▪◦・,]/g, '')
    .replace(/\s+/g, '')
    .trim();
}
