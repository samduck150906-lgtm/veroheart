import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Save, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchEnrichmentQueue,
  saveProductSource,
  updateEnrichmentStatus,
  type EnrichmentQueueRow,
  type EnrichmentStatus,
} from '../../lib/adminApi';
import { notify } from '../../store/useNotification';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: Array<{ value: 'all' | EnrichmentStatus; label: string }> = [
  { value: 'all', label: '전체 상태' },
  { value: 'pending', label: '대기' },
  { value: 'in_progress', label: '조사 중' },
  { value: 'needs_variant', label: '제품 변형 식별 필요' },
  { value: 'ready_for_review', label: '검수 준비' },
  { value: 'completed', label: '완료' },
  { value: 'blocked', label: '공식 정보 미확인' },
];
const MISSING_OPTIONS = [
  { value: 'all', label: '전체 누락' },
  { value: 'ingredients', label: '원재료' },
  { value: 'nutrition', label: '영양정보' },
  { value: 'barcode', label: '바코드' },
  { value: 'image', label: '이미지' },
];
const FIELD_OPTIONS = ['ingredients', 'nutrition', 'calories', 'barcode', 'image', 'manufacturer'];

function sourceCount(row: EnrichmentQueueRow): number {
  return row.source_count ?? 0;
}

export default function AdminDataQuality() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<EnrichmentQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(() => Math.max(1, Number(params.get('page')) || 1));
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [missingField, setMissingField] = useState(params.get('missing') ?? 'all');
  const [selected, setSelected] = useState<EnrichmentQueueRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceType, setSourceType] = useState('manufacturer');
  const [confidence, setConfidence] = useState('official');
  const [rawIngredientText, setRawIngredientText] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldsVerified, setFieldsVerified] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchEnrichmentQueue({
        page,
        pageSize: PAGE_SIZE,
        status,
        missingField,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [missingField, page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set('page', String(page));
    if (status !== 'all') next.set('status', status);
    if (missingField !== 'all') next.set('missing', missingField);
    setParams(next, { replace: true });
  }, [missingField, page, setParams, status]);

  const displayedRange = useMemo(() => {
    if (total === 0) return '0건';
    return `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total.toLocaleString()}건`;
  }, [page, total]);

  const choose = (row: EnrichmentQueueRow) => {
    setSelected(row);
    setSourceUrl('');
    setSourceTitle('');
    setRawIngredientText('');
    setNotes(row.review_note ?? '');
    setFieldsVerified([]);
  };

  const saveSource = async () => {
    if (!selected || !sourceUrl.trim()) return;
    setSaving(true);
    try {
      await saveProductSource({
        productId: selected.product_id,
        sourceUrl: sourceUrl.trim(),
        sourceTitle: sourceTitle.trim(),
        sourceType,
        confidence,
        fieldsVerified,
        rawIngredientText: rawIngredientText.trim(),
        notes: notes.trim(),
      });
      notify.success('출처와 원문을 저장했습니다. 제품 데이터는 검수 후 별도로 반영해 주세요.');
      setSourceUrl('');
      setSourceTitle('');
      setRawIngredientText('');
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (nextStatus: EnrichmentStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateEnrichmentStatus({ productId: selected.product_id, status: nextStatus, note: notes.trim() });
      notify.success('보완 상태를 저장했습니다.');
      setSelected((current) => current ? { ...current, status: nextStatus, review_note: notes.trim() } : null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: 14 }}>
        <div className="admin-card-title-row">
          <div>
            <h2 className="admin-card-title">제품 데이터 보완 큐</h2>
            <p className="admin-item-sub" style={{ marginTop: 5 }}>
              누락 제품을 숨기지 않고 공식 출처, 원문, 신뢰도와 검수 상태를 보존합니다. 비슷한 제품의 정보는 대신 입력하지 마세요.
            </p>
          </div>
          <strong>{displayedRange}</strong>
        </div>
        <div className="admin-filter-row" style={{ marginTop: 14 }}>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={missingField} onChange={(event) => { setMissingField(event.target.value); setPage(1); }}>
            {MISSING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" className="admin-btn-soft" onClick={load}>새로고침</button>
        </div>
      </div>

      {error ? <div className="admin-card admin-empty">보완 큐 조회 실패: {error}</div> : (
        <div className="admin-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead><tr><th>제품</th><th>대상/분류</th><th>누락</th><th>상태</th><th>출처</th><th>관리</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="admin-empty">불러오는 중입니다…</td></tr> : rows.length === 0 ? (
                <tr><td colSpan={6} className="admin-empty">조건에 맞는 보완 대상이 없습니다.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.product_id}>
                  <td><strong>{row.products.name}</strong><div className="admin-item-sub">{row.products.brand_name}</div></td>
                  <td>{row.products.target_pet_type ?? '-'} · {row.products.main_category ?? '미분류'}</td>
                  <td>{row.missing_fields.map((field) => <span className="admin-tag red" key={field} style={{ marginRight: 4 }}>{field}</span>)}</td>
                  <td>{STATUS_OPTIONS.find((item) => item.value === row.status)?.label ?? row.status}</td>
                  <td>{sourceCount(row)}개</td>
                  <td><button type="button" className="admin-btn-soft" onClick={() => choose(row)}>조사·검수</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pagination" style={{ marginTop: 14 }}>
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button>
      </div>

      {selected && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-label="제품 데이터 조사">
            <div className="admin-modal-header">
              <div><h2>{selected.products.name}</h2><p>{selected.products.brand_name}</p></div>
              <button type="button" className="admin-icon-btn" aria-label="닫기" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>보완 상태</label>
                <select value={selected.status} disabled={saving} onChange={(event) => changeStatus(event.target.value as EnrichmentStatus)}>
                  {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="admin-form-group"><label>검수 메모</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="공식 정보 미확인, 국가별 정보 충돌 등" /></div>
              <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
              <h3>검증 출처 추가</h3>
              <div className="admin-form-group"><label>출처 URL *</label><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://manufacturer.example/product" /></div>
              <div className="admin-form-group"><label>페이지 제목</label><input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} /></div>
              <div className="admin-form-row">
                <div className="admin-form-group"><label>출처 유형</label><select value={sourceType} onChange={(event) => setSourceType(event.target.value)}><option value="manufacturer">제조사 공식</option><option value="brand_official">브랜드 공식</option><option value="official_distributor">공식 수입·유통사</option><option value="retailer">판매처</option><option value="label_image">라벨 이미지</option><option value="other">기타</option></select></div>
                <div className="admin-form-group"><label>신뢰도</label><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="official">공식</option><option value="high">높음</option><option value="medium_high">중상</option><option value="medium">보통</option><option value="low">낮음</option><option value="unverified">미검증</option></select></div>
              </div>
              <div className="admin-form-group"><label>확인한 필드</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{FIELD_OPTIONS.map((field) => <label key={field} className="admin-tag"><input type="checkbox" checked={fieldsVerified.includes(field)} onChange={(event) => setFieldsVerified((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))} /> {field}</label>)}</div></div>
              <div className="admin-form-group"><label>원재료 원문</label><textarea value={rawIngredientText} onChange={(event) => setRawIngredientText(event.target.value)} rows={6} placeholder="공식 페이지의 원문을 변형하지 않고 보존" /></div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <Link className="admin-btn-soft" to={`/admin/products?q=${encodeURIComponent(selected.products.name)}`}>제품 편집 <ExternalLink size={14} /></Link>
                <button type="button" className="admin-btn-primary" disabled={saving || !sourceUrl.trim()} onClick={saveSource}><Save size={15} /> 출처 저장</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
