import { useState } from 'react';
import { getLabelSourceWorkspace, registerIngredientLabelSource, type AdminLabelReview, type LabelSourcePayload, type LabelSourceWorkspace } from '../../lib/adminApi';
import { parseIngredientLabelItems } from '../../analysis/labelIngredientParser';
import { sourceDraftIssues } from '../../../supabase/functions/admin-write/labelSource';
const empty = (): LabelSourcePayload => ({ rawText:'',sourceType:'package_image',sourceReference:'',observedAt:'',identityNotes:'',reason:'',items:[],stage:'draft',holdReason:'' });
/** Separate raw-source replacement, never legacy nutrition/ingredient editing or approval. */
export default function ProductLabelSourceRegistration({ productId, disabled=false, onStart, onUncertain, onChanged }: {
  productId: string; disabled?: boolean; onStart: () => void; onUncertain: () => void; onChanged: (review: AdminLabelReview) => void;
}) {
  const [workspace,setWorkspace] = useState<LabelSourceWorkspace | null>(null);
  const [draft,setDraft] = useState(empty);
  const [busy,setBusy] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [uncertain,setUncertain] = useState(false);
  const [preview,setPreview] = useState(false);
  const [message,setMessage] = useState('');
  const current = workspace?.review?.snapshot.labels[0];
  function change(patch: Partial<LabelSourcePayload>) { setDraft(p=>({...p,...patch}));setDirty(true);setPreview(false); }
  async function load() {
    if (dirty && !window.confirm('미저장 원문·항목 편집을 버리고 최신 자료를 조회할까요?')) return;
    setBusy(true);setMessage('');
    try { const w=await getLabelSourceWorkspace(productId);setWorkspace(w);setDraft(empty());setDirty(false);setUncertain(false);setPreview(false);if(w.review)onChanged(w.review); }
    catch { setWorkspace(null);setMessage('원문 조회 실패 — 원문 없음으로 판단하지 않습니다. DB·함수 준비 상태를 확인하세요.'); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!workspace?.review || !preview || busy || disabled || uncertain) return;
    setBusy(true);onStart();setMessage('');
    try { const result=await registerIngredientLabelSource({ productId,revision:workspace.review.revision,labelSetId:current?.id??null,payload:draft });
      setWorkspace(result.workspace);setDraft(empty());setDirty(false);setPreview(false);if(result.workspace.review)onChanged(result.workspace.review);
      setMessage(result.status==='saved'?'새 라벨과 미검토 항목·감사 기록을 저장했습니다. 매칭과 전체 대조 승인은 별도입니다.':'현재 등록 내용과 같아 추가 기록하지 않았습니다.');
    } catch { setUncertain(true);setPreview(false);setMessage('충돌·실패 또는 저장 여부 미확인 — 자동 재전송하지 않습니다. 최신 라벨·감사 기록을 재조회하세요.');onUncertain(); }
    finally { setBusy(false); }
  }
  const issues=sourceDraftIssues(draft);
  return <section aria-label="원문 라벨 등록·교체" aria-busy={busy} style={{display:'grid',gap:10,minWidth:0,overflowWrap:'anywhere'}}>
    <h3>원문 라벨 등록·교체</h3>
    <p>원재료·첨가물 원문만 등록합니다. 사진/OCR·자동 분리안은 초안이며, 일반 원료·영양정보 편집 또는 대조 승인이 아닙니다. 기존 이력과 매칭은 보존하지만 새 라벨로 승계하지 않습니다.</p>
    <button type="button" disabled={busy||disabled} onClick={load}>원문 등록용 최신 자료 조회</button>
    <p role="status">{message}{dirty?' · 미저장 초안':''}{uncertain?' · 재조회 전 저장 차단':''}</p>
    {workspace?.review && <fieldset disabled={busy||disabled||uncertain} style={{minWidth:0,display:'grid',gap:10}}>
      <legend>제품·옵션과 원문 초안</legend>
      <p>현재 제품: {workspace.review.snapshot.product.slice(1,5).filter(Boolean).join(' · ')}</p>
      <details><summary>현재 라벨·항목·출처</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{current?.raw??'현재 등록 라벨 없음'}</pre>
        <ol>{current?.items.map(i=><li key={i.id}>{i.raw} — {i.match}</li>)}</ol>
        {workspace.registration&&<p>최근 원문 등록: {workspace.registration.recordedAt} · {workspace.registration.auditRecorded?'감사 기록 확인됨':'감사 기록 미확인 — 재저장하지 말고 조사'}</p>}
        <p>{workspace.registration?.payload.sourceReference??current?.source??'출처 없음'}</p></details>
      <label>전체 원재료·첨가물 원문<textarea rows={10} value={draft.rawText} onChange={e=>change({rawText:e.target.value})} maxLength={30000} style={{width:'100%',boxSizing:'border-box'}} /></label>
      <label>출처 종류<select value={draft.sourceType} onChange={e=>change({sourceType:e.target.value as LabelSourcePayload['sourceType']})}><option value="package_image">포장 사진/OCR 초안</option><option value="manufacturer">제조사 공식 자료</option><option value="manual">직접 전사</option><option value="import">이관 초안</option><option value="other">기타</option></select></label>
      <label>원문 출처 (공개 HTTPS 또는 package:사진참조)<input value={draft.sourceReference} onChange={e=>change({sourceReference:e.target.value})} maxLength={2000} /></label>
      <label>실제 확인 시점 (시간대 포함, 예: 2026-11-16T10:00:00+09:00)<input value={draft.observedAt} onChange={e=>change({observedAt:e.target.value})} /></label>
      <label>제품·맛·중량·포장 수량·표시된 개정 대응 근거<textarea value={draft.identityNotes} onChange={e=>change({identityNotes:e.target.value})} maxLength={2000} /></label>
      <label>등록·교체 이유<textarea value={draft.reason} onChange={e=>change({reason:e.target.value})} maxLength={2000} /></label>
      <button type="button" onClick={()=>{try{change({items:parseIngredientLabelItems(draft.rawText).map(i=>({rawText:i.rawText,section:'ingredients'}))});}catch{setMessage('항목 초안이 100개를 초과합니다. 원문을 임의로 자르지 말고 명시적으로 보류해 주세요.');}}}>원문에서 항목 초안 제안 (자동 확정 안 함)</button>
      <p>괄호·복합 원료·반복을 보존하고 첨가물 구역을 직접 확인하세요. 해석 불가 구간은 보류합니다. 항목 수 일치는 완전성 증거가 아닙니다.</p>
      <ol>{draft.items.map((i,n)=><li key={n}><label>항목 {n+1}<textarea value={i.rawText} onChange={e=>change({items:draft.items.map((x,k)=>k===n?{...x,rawText:e.target.value}:x)})} maxLength={2000} /></label>
        <label>구역 {n+1}<select aria-label={`구역 ${n+1}`} value={i.section} onChange={e=>change({items:draft.items.map((x,k)=>k===n?{...x,section:e.target.value as typeof i.section}:x)})}><option value="ingredients">원재료</option><option value="additives">첨가물</option><option value="unresolved">해석 미확정</option></select></label>
        <button type="button" onClick={()=>change({items:draft.items.filter((_,k)=>k!==n)})}>항목 {n+1} 삭제 (새 초안)</button></li>)}</ol>
      <button type="button" disabled={draft.items.length>=100} onClick={()=>change({items:[...draft.items,{rawText:'',section:'unresolved'}]})}>항목 추가</button>
      <label><input type="checkbox" checked={draft.stage==='held'} onChange={e=>change({stage:e.target.checked?'held':'draft'})} />누락·해석 불가·대응 미확정으로 보류 (승인 불가)</label>
      <label>보류 사유<textarea value={draft.holdReason} onChange={e=>change({holdReason:e.target.value})} maxLength={2000} /></label>
      {!!issues.length&&<ul>{issues.map(i=><li key={i}>{i}</li>)}</ul>}
      <button type="button" onClick={()=>setPreview(true)} disabled={!dirty || !draft.rawText.trim() || (issues.length>0&&draft.stage!=='held')}>저장 전 변경 비교</button>
      {preview&&<section aria-label="저장 전 변경 비교"><h4>현재 → 새 revision</h4><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{current?.raw??'(라벨 없음)'}{'\n→\n'}{draft.rawText}</pre>
        <p>기존 {current?.items.length??0}개 항목은 이력에 보존합니다. 새 {draft.items.length}개 항목은 전부 미검토·매칭 없음으로 시작합니다.</p>
        <ol>{Array.from({length:Math.max(current?.items.length??0,draft.items.length)},(_,n)=><li key={n}>이전: {current?.items[n]?.raw??'(없음)'} → {draft.items[n]?`새 ${draft.items[n].section}: ${draft.items[n].rawText}`:'새 초안에서 제거 — 이전 항목은 이력에 보존'}</li>)}</ol>
        <p>이전 출처·확인 시점: {workspace.registration?.payload.sourceReference??current?.source??'(없음)'} · {workspace.registration?.payload.observedAt??'(미등록)'}</p>
        <p>{draft.sourceReference} · {draft.observedAt} · {draft.identityNotes} · {draft.stage==='held'?'보류':'미검토 초안'}</p>
        <button type="button" onClick={save}>새 원문 revision 저장 (승인 아님)</button><button type="button" onClick={()=>setPreview(false)}>비교 취소</button></section>}
    </fieldset>}
    <button type="button" disabled={busy||disabled} onClick={()=>{setDraft(empty());setDirty(false);setPreview(false);}}>초안 초기화</button>
  </section>;
}
