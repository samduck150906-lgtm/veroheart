import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Plus, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  RISK_DECISION_BATCH,
  applyRiskDecisions,
  fetchRiskReviewIngredients,
  type ReviewedIngredientRow,
} from '../../lib/adminApi';
import {
  RISK_LABEL,
  reviewIngredientRisks,
  type FindingKind,
  type RiskFinding,
} from '../../utils/ingredientRiskReview';

const KIND_TABS: { key: FindingKind; label: string; hint: string }[] = [
  {
    key: 'conflict',
    label: '표기 불일치',
    hint: '같은 물질이 표기별로 다르게 분류돼 있습니다. 사전 안에서 앞뒤가 맞지 않는 값이라 가장 먼저 정리해야 합니다.',
  },
  {
    key: 'upgrade',
    label: '재분류 후보',
    hint: '반려동물에게 문제가 된다고 알려진 성분인데 사전에는 더 낮은 위험도로 등록돼 있습니다.',
  },
  {
    key: 'missing',
    label: '누락된 위험 성분',
    hint: '사전에 아예 없는 성분입니다. 사전에 없으면 제품 원재료에 그 이름이 있어도 위험으로 잡히지 않습니다.',
  },
];

function riskTagClass(level: string): string {
  if (level === 'danger') return 'red';
  if (level === 'caution') return 'orange';
  return 'green';
}

/** 후보 하나를 화면에서 구분할 키. 'missing' 은 성분 id 가 없어 기준표 이름을 쓴다. */
function findingKey(finding: RiskFinding): string {
  return finding.ingredient?.id ?? `ref:${finding.reference?.nameKo ?? ''}`;
}

/**
 * 성분 위험도 검수.
 *
 * 사전이 대량 임포트로 만들어져서 같은 물질이 표기별로 다르게 분류되고, 널리
 * 알려진 위험 성분은 아예 빠져 있다. 여기서는 그 후보와 근거를 보여 주고,
 * 운영자가 고른 것만 반영한다.
 *
 * 자동 적용 버튼을 두지 않은 이유: 위험도는 보호자가 급여 여부를 정하는 값이다.
 * 한 번 잘못 올리면 멀쩡한 제품이 위험 표시를 달고, 잘못 내리면 반대가 된다.
 */
const AdminRiskReview: React.FC = () => {
  const [rows, setRows] = useState<ReviewedIngredientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<FindingKind>('conflict');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      setRows(await fetchRiskReviewIngredients());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const findings = useMemo(() => reviewIngredientRisks(rows), [rows]);
  const visible = useMemo(() => findings.filter((item) => item.kind === kind), [findings, kind]);
  const counts = useMemo(() => {
    const map: Record<FindingKind, number> = { conflict: 0, upgrade: 0, missing: 0 };
    for (const finding of findings) map[finding.kind] += 1;
    return map;
  }, [findings]);

  const selectedFindings = useMemo(
    () => findings.filter((item) => selected.has(findingKey(item))),
    [findings, selected],
  );

  const toggle = (finding: RiskFinding) => {
    const key = findingKey(finding);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const finding of visible) next.add(findingKey(finding));
      return next;
    });
  };

  const apply = async () => {
    if (applying || selectedFindings.length === 0) return;
    setApplying(true);
    try {
      let updated = 0;
      let created = 0;
      const skipped: string[] = [];

      // Edge Function 한 요청당 상한이 있어 나눠 보낸다.
      for (let offset = 0; offset < selectedFindings.length; offset += RISK_DECISION_BATCH) {
        const batch = selectedFindings.slice(offset, offset + RISK_DECISION_BATCH);
        const result = await applyRiskDecisions({
          updates: batch
            .filter((item) => item.ingredient)
            .map((item) => ({ id: item.ingredient!.id, riskLevel: item.suggestedLevel })),
          creates: batch
            .filter((item) => !item.ingredient && item.reference)
            .map((item) => ({
              nameKo: item.reference!.nameKo,
              nameEn: item.reference!.nameEn,
              riskLevel: item.reference!.level,
              category: item.reference!.category,
              description: item.reference!.reason,
            })),
        });
        updated += result.updated;
        created += result.created;
        skipped.push(...result.skipped);
      }

      const parts = [];
      if (updated > 0) parts.push(`위험도 ${updated}건 변경`);
      if (created > 0) parts.push(`성분 ${created}건 등록`);
      notify.success(parts.length > 0 ? `${parts.join(' · ')}했습니다.` : '변경된 내용이 없습니다.');
      if (skipped.length > 0) notify.error(`건너뜀 ${skipped.length}건: ${skipped[0]}`);
      await load();
    } catch (err) {
      notify.error(`반영 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setApplying(false);
    }
  };

  const activeTab = KIND_TABS.find((item) => item.key === kind);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>위험도 검수</h2>
          <p>
            검수 후보 {findings.length.toLocaleString()}건 · 선택 {selectedFindings.length.toLocaleString()}건
            {rows.length > 0 && ` · 사전 ${rows.length.toLocaleString()}개 성분`}
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading || applying}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button
            type="button"
            className="admin-btn-soft"
            onClick={selectAllVisible}
            disabled={loading || applying || visible.length === 0}
          >
            <Check size={15} /> 이 탭 전체 선택
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={apply}
            disabled={applying || selectedFindings.length === 0}
          >
            <Save size={15} /> {applying ? '반영 중…' : `선택 ${selectedFindings.length.toLocaleString()}건 반영`}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          <strong>자동으로 바꾸지 않습니다.</strong> 위험도는 보호자가 급여 여부를 정하는 값이라,
          고른 항목만 반영합니다. 바꾸기 전 값은 감사 로그에 남습니다.
          <br />
          제품 수가 많은 성분부터 보여 줍니다 — 같은 한 번의 수정이라도 영향 범위가 다릅니다.
        </p>
      </div>

      <div className="admin-filter-row">
        {KIND_TABS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`admin-chip ${kind === item.key ? 'active' : ''}`}
            onClick={() => setKind(item.key)}
          >
            {item.label} {counts[item.key] > 0 && `(${counts[item.key]})`}
          </button>
        ))}
      </div>

      {activeTab && (
        <p className="admin-item-sub" style={{ margin: '10px 2px 14px' }}>{activeTab.hint}</p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>선택</th>
              <th>성분</th>
              <th style={{ width: 96 }}>현재</th>
              <th style={{ width: 32 }} aria-label="변경" />
              <th style={{ width: 96 }}>제안</th>
              <th style={{ width: 92 }}>사용 제품</th>
              <th>근거</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="admin-empty">성분을 불러오는 중입니다…</div></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    성분을 불러오지 못했습니다: {error}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    {kind === 'conflict' && '표기별로 위험도가 엇갈리는 성분이 없습니다.'}
                    {kind === 'upgrade' && '기준보다 낮게 분류된 성분이 없습니다.'}
                    {kind === 'missing' && '기준표의 위험 성분이 모두 사전에 있습니다.'}
                  </div>
                </td>
              </tr>
            ) : visible.map((finding) => {
              const key = findingKey(finding);
              const name = finding.ingredient?.name_ko ?? finding.reference?.nameKo ?? '';
              const subName = finding.ingredient?.name_en ?? finding.reference?.nameEn ?? '';
              return (
                <tr key={key}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(finding)}
                      disabled={applying}
                      aria-label={`${name} 검수 선택`}
                    />
                  </td>
                  <td>
                    <div className="admin-item-main">{name}</div>
                    <div className="admin-item-sub">
                      {subName}
                      {finding.reference?.species && (
                        <span className="admin-tag gray" style={{ marginLeft: 6 }}>
                          {finding.reference.species === 'cat' ? '고양이 주의' : '강아지 주의'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {finding.currentLevel ? (
                      <span className={`admin-tag ${riskTagClass(finding.currentLevel)}`}>
                        {RISK_LABEL[finding.currentLevel]}
                      </span>
                    ) : (
                      <span className="admin-item-sub">사전에 없음</span>
                    )}
                  </td>
                  <td aria-hidden="true" style={{ color: '#94a3b8' }}>
                    {finding.kind === 'missing' ? <Plus size={16} /> : <ArrowRight size={16} />}
                  </td>
                  <td>
                    <span className={`admin-tag ${riskTagClass(finding.suggestedLevel)}`}>
                      {finding.suggestedLevel === 'danger' && <ShieldAlert size={11} />}
                      {RISK_LABEL[finding.suggestedLevel]}
                    </span>
                  </td>
                  <td>
                    {finding.kind === 'missing' ? (
                      <span className="admin-item-sub">-</span>
                    ) : (
                      <strong>{finding.productCount.toLocaleString()}개</strong>
                    )}
                  </td>
                  <td>
                    <div className="admin-item-sub" style={{ lineHeight: 1.6 }}>
                      {finding.kind === 'conflict' && (
                        <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      )}
                      {finding.reason}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRiskReview;
