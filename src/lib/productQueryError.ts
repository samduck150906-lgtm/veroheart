/** Safe public copy; raw DB errors/rows are never rendered as product absence. */
export class ProductQueryError extends Error {
  constructor() {
    super('제품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    this.name = 'ProductQueryError';
  }
}
