import { useState } from 'react';
import { getIngredientLabelReview, approveIngredientLabelReview, type AdminLabelReview } from '../../lib/adminApi';
import ProductLabelItemMatching from './ProductLabelItemMatching';

/** An explicit review, never a side effect of saving products or matching items. */
export default function ProductLabelReview({ productId }: { productId: string }) {
  return <SavedProductLabelReview key={productId} productId={productId} />;
}

function SavedProductLabelReview({ productId }: { productId: string }) {
  const [review, setReview] = useState<AdminLabelReview | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [identity, setIdentity] = useState('');
  const [coverage, setCoverage] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [wholeLabelCompared, setWholeLabelCompared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [matchingPending, setMatchingPending] = useState(false);
  function resetConfirmations() { setChecked([]); setSource(''); setIdentity(''); setCoverage(''); setIdentityConfirmed(false); setWholeLabelCompared(false); }
  const label = review?.snapshot.labels[0];
  async function load() {
    setBusy(true); setMessage(''); setReview(null); setChecked([]); setSource(''); setIdentity(''); setCoverage('');
    setIdentityConfirmed(false); setWholeLabelCompared(false);
    try { setReview(await getIngredientLabelReview(productId)); setNeedsRecheck(false); }
    catch { setMessage('검토 자료를 조회하지 못했습니다. 서버·DB 준비 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  }
  async function approve() {
    if (!review || !label || busy || matchingPending || needsRecheck) return;
    setBusy(true);
    try {
      const response = await approveIngredientLabelReview({ productId, revision: review.revision,
        reviewedItemIds: [...label.items].sort((a,b) => a.order-b.order).map(i => i.id),
        sourceReference: source, identityNotes: identity, coverageNotes: coverage, identityConfirmed, wholeLabelCompared });
      setMessage(response.result.status === 'approved' ? '전체 대조 증거와 감사 기록을 저장했습니다.' : '이 버전의 대조 증거는 이미 저장돼 있습니다.');
      setReview(null);
    } catch { setMessage('승인 결과를 확인하지 못했습니다. 재승인 전에 자료·감사 기록을 다시 조회해 주세요.'); setReview(null); }
    finally { setBusy(false); }
  }
  return <section className="label-review-panel" aria-label="전성분 전체 대조 검토" style={{ display:'grid', gap:10 }}>
    <button type="button" onClick={load} disabled={busy || matchingPending}>저장된 라벨 전체 대조 자료 조회</button>
    <p>현재 편집 중인 값은 승인되지 않습니다. 제품·원료 저장을 마친 뒤 새로 조회하고 실제 원본 포장의 전성분과 직접 대조하세요.</p>
    {message && <p role="status">{message}</p>}
    {needsRecheck && <p role="status">항목 변경 결과가 확인될 때까지 전체 대조 승인을 보류합니다. 최신 자료를 다시 조회해 주세요.</p>}
    {review?.approvalState && <p role="status">저장된 대조 증거: {review.approvalState === 'verified' ? '현재 버전' : review.approvalState === 'stale' ? '이전 버전 — 재검토 필요' : '없음'}
      {review.auditRecorded ? ' · 감사 기록 확인됨' : ''}</p>}
    {review && review.snapshot.labels.length !== 1 && <p role="status">{review.snapshot.labels.length === 0
      ? '저장된 현재 라벨이 없습니다. 원문·항목 등록이 필요하며 기존 원료 목록을 대조 완료로 승격하지 않습니다.'
      : '현재 라벨이 여러 개여서 검토할 수 없습니다. 충돌을 먼저 해결해 주세요.'}</p>}
    {review && label && review.snapshot.labels.length === 1 && <>
      <p>제품: {review.snapshot.product.slice(1,5).filter(Boolean).join(' · ')}</p>
      <pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{label.raw}</pre>
      <p>기존 출처: {label.source || '없음 — 새로운 원본 근거 필요'}</p>
      {label.items.map(i => <label key={i.id}><input type="checkbox" checked={checked.includes(i.id)}
        onChange={e => setChecked(v => e.target.checked ? [...v,i.id] : v.filter(id => id!==i.id))} />{i.raw} ({i.match})</label>)}
      <label>이번에 직접 확인한 원본 이미지·공식 자료 참조<input value={source} onChange={e => setSource(e.target.value)} maxLength={2000} /></label>
      <label>맛·용량·포장·개정 대응 근거<textarea value={identity} onChange={e => setIdentity(e.target.value)} maxLength={2000} /></label>
      <label>원문 전체 대조·누락 여부 확인 기록<textarea value={coverage} onChange={e => setCoverage(e.target.value)} maxLength={2000} /></label>
      <label><input type="checkbox" checked={identityConfirmed} onChange={e => setIdentityConfirmed(e.target.checked)} />이 제품·포장과 원본의 대응을 직접 확인했습니다.</label>
      <label><input type="checkbox" checked={wholeLabelCompared} onChange={e => setWholeLabelCompared(e.target.checked)} />원본 전체를 대조했고 누락·미확인 항목이 없습니다.</label>
      {!review.eligible && <p>미매칭·충돌 항목 또는 라벨 구조를 먼저 해결해야 합니다.</p>}
      <button type="button" disabled={busy || matchingPending || needsRecheck || !review.eligible || checked.length!==label.items.length || !source.trim() || !identity.trim() || !coverage.trim() || !identityConfirmed || !wholeLabelCompared}
        onClick={approve}>전체 대조 승인 기록</button>
      <button type="button" onClick={() => setReview(null)} disabled={busy || matchingPending}>검토 취소</button>
    </>}
    {review && <ProductLabelItemMatching key={productId} productId={productId}
      onMutationStart={() => { setNeedsRecheck(true); setMatchingPending(true); resetConfirmations(); }}
      onMutationUncertain={() => setMatchingPending(false)}
      onReviewChanged={value => { setMatchingPending(false); setReview(value); setNeedsRecheck(false); resetConfirmations(); }} />}
  </section>;
}
