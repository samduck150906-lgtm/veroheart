import { useEffect, useRef, useState } from 'react';
import { getLabelItemWorkspace, searchLabelItemCandidates, reviewLabelItemMatch,
  type AdminLabelReview, type LabelItemCandidate, type LabelItemWorkspace } from '../../lib/adminApi';
import './ProductLabelItemMatching.css';

interface Props {
  productId: string;
  onMutationStart: () => void;
  onMutationUncertain: () => void;
  onReviewChanged: (review: AdminLabelReview) => void;
}

/** Explicit saved-label decisions; never edits raw text, order or the legacy list. */
export default function ProductLabelItemMatching({ productId, onMutationStart, onMutationUncertain, onReviewChanged }: Props) {
  const [workspace, setWorkspace] = useState<LabelItemWorkspace | null>(null);
  const [itemId, setItemId] = useState('');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<LabelItemCandidate[]>([]);
  const [target, setTarget] = useState('');
  const [decision, setDecision] = useState<'match' | 'hold'>('hold');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState('');
  const epoch = useRef(0);
  useEffect(() => { epoch.current++; setWorkspace(null); setCandidates([]); setItemId(''); setMessage(''); setBusy(false); setNeedsReload(false); setQuery(''); setTarget(''); setDecision('hold'); setReason(''); setConfirmed(false); }, [productId]);
  useEffect(() => () => { epoch.current++; }, []);
  const label = workspace?.review?.snapshot.labels.length === 1 ? workspace.review.snapshot.labels[0] : null;
  const item = label?.items.find(i => i.id === itemId);
  const selected = candidates.find(c => `${c.kind}:${c.id}` === target);
  const lastDecision = workspace?.decisions.find(d => d.itemId === itemId);

  async function load() {
    const run = ++epoch.current;
    setBusy(true); setMessage(''); setWorkspace(null); setCandidates([]); setItemId('');
    setReason(''); setConfirmed(false); setTarget('');
    try {
      const value = await getLabelItemWorkspace(productId);
      if (epoch.current !== run) return;
      setWorkspace(value); setNeedsReload(false);
      if (value.review) onReviewChanged(value.review);
    } catch { if (epoch.current === run) setMessage('라벨 항목 검토 자료를 조회하지 못했습니다. DB·서버 준비 상태를 확인해 주세요.'); }
    finally { if (epoch.current === run) setBusy(false); }
  }
  async function search() {
    const run = ++epoch.current;
    setBusy(true); setMessage(''); setCandidates([]); setTarget(''); setConfirmed(false);
    try { const value = await searchLabelItemCandidates(query); if (epoch.current === run) setCandidates(value); }
    catch { if (epoch.current === run) setMessage('후보 조회 실패입니다. 후보 없음으로 판단하지 마세요.'); }
    finally { if (epoch.current === run) setBusy(false); }
  }
  function chooseItem(id: string) {
    epoch.current++; setItemId(id); setCandidates([]); setTarget(''); setConfirmed(false); setDecision('hold');
    setReason(''); setQuery(label?.items.find(i => i.id === id)?.raw ?? ''); setMessage('');
  }
  async function save() {
    if (!workspace?.review || !item || busy || needsReload || !confirmed || !reason.trim()
      || (decision === 'match' && !selected?.selectable)) return;
    const run = ++epoch.current;
    setBusy(true); setMessage(''); onMutationStart();
    try {
      const result = await reviewLabelItemMatch({ productId, revision: workspace.review.revision, itemId: item.id,
        decision, reason: reason.trim(), ...(decision === 'match' && selected ? {
          targetKind: selected.kind, targetId: selected.id, targetRevision: selected.revision } : {}) });
      if (epoch.current !== run) return;
      setWorkspace(result.workspace); setCandidates([]); setTarget(''); setConfirmed(false); setReason('');
      if (result.workspace.review) onReviewChanged(result.workspace.review);
      setMessage(result.status === 'unchanged' ? '같은 상태입니다. 추가 변경·감사는 없습니다.' : '항목 검토와 감사를 저장했습니다. 전체 대조는 새 revision으로 다시 확인해 주세요.');
    } catch {
      if (epoch.current === run) { onMutationUncertain(); setNeedsReload(true); setConfirmed(false); setMessage('충돌 또는 결과 미확인입니다. 다시 저장하지 말고 최신 자료를 재조회해 주세요.'); }
    } finally { if (epoch.current === run) setBusy(false); }
  }

  return <section className="label-item-matching" aria-label="저장된 라벨 항목 매칭">
    <h3>라벨 항목 매칭 — 일반 원료 목록 편집과 별개</h3>
    <p>원문·순서·중복 항목은 보존합니다. 후보 선택은 성분 사전 연결이며 정확한 식별이나 전성분 대조 완료를 보장하지 않습니다. 자동 확정하지 않습니다. 원문 수정이나 항목 추가·삭제는 별도 검토 작업입니다.</p>
    <button type="button" disabled={busy} onClick={load}>최신 라벨 항목 조회</button>
    {message && <p role="status">{message}</p>}
    {workspace?.review && !label && <p role="status">현재 라벨이 없거나 여러 개입니다. 라벨 등록·충돌 해결이 먼저 필요합니다.</p>}
    {label && <>
      <h4>원문 라벨</h4><pre>{label.raw}</pre>
      <label>검토할 항목<select aria-label="검토할 항목" value={itemId} disabled={busy} onChange={e => chooseItem(e.target.value)}>
        <option value="">항목을 선택하세요</option>
        {label.items.map(i => <option key={i.id} value={i.id}>{i.order + 1}. {i.raw} ({i.match})</option>)}
      </select></label>
      {item && <>
        {(reason.trim() || selected || confirmed) && <p role="status">미저장 선택·사유입니다. 재조회 또는 항목 이동 시 초기화되며, 저장 전에는 반영되지 않습니다.</p>}
        <p>선택 원문: {item.raw}</p>
        <p>현재 매칭: {item.resolved?.[2] ? String(item.resolved[2]) : '연결 없음'} · {item.match}</p>
        <p>최근 검토 근거/보류 사유: {lastDecision?.reason || '저장된 사유 없음'}</p>
        <label>성분 후보 검색<input value={query} maxLength={100} disabled={busy || needsReload} onChange={e => { setQuery(e.target.value); setTarget(''); setConfirmed(false); }} /></label>
        <button type="button" disabled={busy || needsReload || !query.trim()} onClick={search}>후보 조회</button>
        <label>매칭 후보<select aria-label="매칭 후보" value={target} disabled={busy || needsReload} onChange={e => { setTarget(e.target.value); setDecision('match'); setConfirmed(false); }}>
          <option value="">자동 선택하지 않음</option>
          {candidates.map(c => <option key={`${c.kind}:${c.id}`} value={`${c.kind}:${c.id}`} disabled={!c.selectable}>
            {c.kind === 'canonical' ? '표준 원료' : '기존 성분 사전'} · {c.nameKo} · {c.risk || '위험정보 미확인'}{c.selectable ? '' : ' (검토 전/사용 불가)'}
          </option>)}
        </select></label>
        {selected && <div aria-label="선택 후보 정의"><p>{selected.nameKo}{selected.nameEn ? ` · ${selected.nameEn}` : ''}</p><p>{selected.description || '사전 설명 없음 — 추가 근거 확인 필요'}</p></div>}
        <p>검색 결과만으로 매칭하지 마세요. 모호한 복합 원료는 한 성분에 억지로 연결하지 말고 보류하세요.</p>
        <fieldset disabled={busy || needsReload}><legend>이번 항목 결정</legend>
          <label><input type="radio" name={`decision-${productId}`} checked={decision === 'match'} onChange={() => { setDecision('match'); setConfirmed(false); }} />선택 후보로 매칭</label>
          <label><input type="radio" name={`decision-${productId}`} checked={decision === 'hold'} onChange={() => { setDecision('hold'); setConfirmed(false); }} />미확정으로 보류 (연결 해제·미검토 유지)</label>
        </fieldset>
        <label>검토 근거 또는 보류 사유<textarea value={reason} maxLength={2000} disabled={busy || needsReload} onChange={e => { setReason(e.target.value); setConfirmed(false); }} /></label>
        <div aria-label="항목 변경 전후">
          <p>변경 전: {item.resolved?.[2] ? String(item.resolved[2]) : '연결 없음'} · {item.match}</p>
          <p>변경 후: {decision === 'hold' ? '연결 없음 · 미검토/보류' : selected ? `${selected.nameKo} · ${selected.kind} · matched` : '후보 미선택'}</p>
          <p>원문·표시 순서·함량은 바뀌지 않습니다. 매칭 변경은 기존 전체 대조 증거를 무효화합니다.</p>
        </div>
        <label><input type="checkbox" checked={confirmed} disabled={busy || needsReload} onChange={e => setConfirmed(e.target.checked)} />원문과 변경 전후 및 근거를 직접 확인했습니다.</label>
        <button type="button" onClick={save} disabled={busy || needsReload || !confirmed || !reason.trim() || (decision === 'match' && !selected?.selectable)}>이 항목 검토 저장</button>
      </>}
    </>}
  </section>;
}
