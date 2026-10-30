import { ValidationError, requireUuid } from './validation.ts';

const fields = new Set([
  'id', 'product_id', 'expected_revision', 'merchant', 'original_url', 'resolved_url',
  'link_kind', 'verification_status', 'seller_product_id', 'seller_item_id', 'seller_offer_id',
  'target_observation_id', 'seller_observation_id', 'verification_valid_until',
  'availability', 'availability_valid_until', 'hold_reason',
]);
const hosts = new Set(['coupang.com', 'www.coupang.com', 'm.coupang.com', 'link.coupang.com']);

export function normalizePurchaseLinkRequest(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ValidationError('연결 형식이 올바르지 않습니다.');
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some((key) => !fields.has(key))) throw new ValidationError('허용되지 않은 연결 필드입니다.');
  const result: Record<string, unknown> = {};
  for (const key of fields) {
    const value = input[key];
    if (key === 'expected_revision') {
      if (!Number.isSafeInteger(value) || (value as number) < 0) throw new ValidationError('연결 버전이 올바르지 않습니다.');
      result[key] = value;
    } else if (['id', 'product_id'].includes(key)) {
      result[key] = requireUuid(value, key);
    } else if (key.endsWith('_observation_id')) {
      result[key] = value == null ? null : requireUuid(value, key);
    } else if (key.endsWith('_url')) {
      if (value == null && key === 'resolved_url') { result[key] = null; continue; }
      if (typeof value !== 'string' || value.length > 2000 || /\s/u.test(value)
        || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
        throw new ValidationError('URL 형식이 올바르지 않습니다.');
      }
      let url: URL;
      try { url = new URL(value); } catch { throw new ValidationError('URL 형식이 올바르지 않습니다.'); }
      if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.username || url.password || url.port) throw new ValidationError('허용되지 않은 판매처 URL입니다.');
      result[key] = value;
    } else if (key.endsWith('_until')) {
      if (value == null) { result[key] = null; continue; }
      if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new ValidationError('확인 유효기간이 올바르지 않습니다.');
      result[key] = new Date(value).toISOString();
    } else {
      if (value == null) { result[key] = null; continue; }
      if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new ValidationError('연결 값이 올바르지 않습니다.');
      result[key] = value;
    }
  }
  if (result.merchant !== 'coupang'
    || !['product', 'search', 'unknown'].includes(String(result.link_kind))
    || !['unverified', 'verified', 'mismatch', 'stale'].includes(String(result.verification_status))
    || !['unknown', 'in_stock', 'out_of_stock'].includes(String(result.availability))) {
    throw new ValidationError('연결 상태가 올바르지 않습니다.');
  }
  if (result.verification_status === 'verified') {
    const url = result.resolved_url ? new URL(String(result.resolved_url)) : null;
    if (!url || !['coupang.com', 'www.coupang.com', 'm.coupang.com'].includes(url.hostname)
      || url.hash || !/^\d{1,32}$/.test(String(result.seller_product_id))
      || [...url.searchParams.keys()].some((key) => key !== 'itemId' && key !== 'vendorItemId')
      || !/^\d{1,32}$/.test(String(result.seller_item_id))
      || !/^\d{1,32}$/.test(String(result.seller_offer_id))
      || ![ `/vp/products/${result.seller_product_id}`, `/vp/products/${result.seller_product_id}/` ].includes(url.pathname)
      || url.searchParams.getAll('itemId').length !== 1
      || url.searchParams.get('itemId') !== result.seller_item_id
      || url.searchParams.getAll('vendorItemId').length !== 1
      || url.searchParams.get('vendorItemId') !== result.seller_offer_id) {
      throw new ValidationError('판매처 도착 URL과 상품·옵션 ID가 일치하지 않습니다.');
    }
  }
  return result;
}
