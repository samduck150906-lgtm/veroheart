export class BarcodeLookupError extends Error {
  readonly reason: 'ambiguous' | 'unavailable';

  constructor(reason: 'ambiguous' | 'unavailable') {
    super(reason === 'ambiguous'
      ? '같은 바코드의 제품이 여러 개 있습니다. 제품명으로 검색해 주세요.'
      : '제품을 확인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    this.name = 'BarcodeLookupError';
    this.reason = reason;
  }
}
