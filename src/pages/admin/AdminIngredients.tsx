import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  FlaskConical,
  AlertTriangle,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSearchField,
  AdminSectionCard,
  AdminToolbar,
} from '../../components/admin/AdminUI';

interface Ingredient {
  id: string;
  name_ko: string;
  name_en: string;
  risk_level: 'safe' | 'caution' | 'danger';
  description: string;
  category?: string;
}

const INGREDIENT_CATEGORIES = [
  '단백질원', '탄수화물원', '지방원', '비타민·미네랄', '기능성 성분', '보존료·산화방지제', '유산균', '기타'
];

const AdminIngredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Partial<Ingredient>>({});

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name_ko', { ascending: true });

    if (!error && data) {
      setIngredients(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentIngredient.name_ko || !currentIngredient.risk_level) {
      notify.error('한글 성분명과 위험도는 필수입니다.');
      return;
    }

    try {
      if (currentIngredient.id) {
        const { error } = await supabase.from('ingredients').update(currentIngredient).eq('id', currentIngredient.id);
        if (error) throw error;
        notify.success('성분 정보가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('ingredients').insert([currentIngredient]);
        if (error) throw error;
        notify.success('신규 성분이 등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchIngredients();
    } catch (err: any) {
      notify.error(`저장 실패: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 이 성분을 삭제하시겠습니까? 관련 데이터가 영향을 받을 수 있습니다.')) {
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) {
        notify.error('삭제 실패');
      } else {
        notify.success('성분이 삭제되었습니다.');
        fetchIngredients();
      }
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.name_en && i.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const safeCount = ingredients.filter(i => i.risk_level === 'safe').length;
  const cautionCount = ingredients.filter(i => i.risk_level === 'caution').length;
  const dangerCount = ingredients.filter(i => i.risk_level === 'danger').length;
  const categorizedCount = ingredients.filter((item) => item.category).length;
  const latestIngredients = [...ingredients].slice(0, 5);

  return (
    <div className="admin-page-shell animate-fade-in">
      <AdminPageHeader
        eyebrow="ingredient intelligence"
        title="성분 사전 관리"
        description="분석 엔진이 참조하는 성분 데이터와 위험도 레벨을 B2B 운영 기준으로 관리합니다."
        actions={(
          <AdminButton
            onClick={() => { setCurrentIngredient({ risk_level: 'safe' }); setIsModalOpen(true); }}
            style={{ minWidth: '180px' }}
          >
            <Plus size={18} />
            신규 성분 등록
          </AdminButton>
        )}
      />

      <div className="admin-metric-grid admin-metric-grid-4">
        <AdminMetricCard
          label="전체 성분 사전"
          value={ingredients.length.toLocaleString()}
          delta="+8.6%"
          icon={<FlaskConical size={20} />}
          tone="indigo"
          footnote="분석 엔진 참조 기준"
        />
        <AdminMetricCard
          label="안전 성분"
          value={safeCount.toLocaleString()}
          delta={`${ingredients.length ? ((safeCount / ingredients.length) * 100).toFixed(1) : '0'}%`}
          icon={<ShieldCheck size={20} />}
          tone="emerald"
          footnote="기본 추천 우호"
        />
        <AdminMetricCard
          label="주의 성분"
          value={cautionCount.toLocaleString()}
          delta="검토 필요"
          icon={<AlertTriangle size={20} />}
          tone="amber"
          footnote="조건부 안내 필요"
        />
        <AdminMetricCard
          label="위험 성분"
          value={dangerCount.toLocaleString()}
          delta="강조 노출"
          icon={<AlertTriangle size={20} />}
          tone="rose"
          footnote="차단/경고 우선"
        />
      </div>

      <div className="admin-two-column-layout">
        <div className="admin-column-main">
          <AdminSectionCard
            title="성분 사전"
            description="한글/영문명, 위험도, 카테고리, 설명을 한 테이블에서 관리합니다."
          >
            <AdminToolbar
              left={(
                <AdminSearchField
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="성분명(한글/영문)으로 검색하세요"
                />
              )}
              right={(
                <div className="admin-toolbar-meta">
                  <AdminBadge tone="slate">검색 결과 {filteredIngredients.length}개</AdminBadge>
                </div>
              )}
            />

            {loading ? (
              <AdminEmptyState title="성분 사전 불러오는 중" description="Supabase에서 최신 성분 데이터를 동기화하고 있습니다." />
            ) : filteredIngredients.length === 0 ? (
              <AdminEmptyState
                title="검색 결과가 없습니다"
                description="검색어를 바꾸거나 신규 성분을 등록해 보세요."
                action={(
                  <AdminButton
                    variant="secondary"
                    onClick={() => { setCurrentIngredient({ risk_level: 'safe' }); setIsModalOpen(true); }}
                  >
                    <Plus size={16} />
                    신규 성분 등록
                  </AdminButton>
                )}
              />
            ) : (
              <div className="admin-table-shell">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>성분명</th>
                      <th>위험도</th>
                      <th>분류</th>
                      <th>설명</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map((ing) => (
                      <tr key={ing.id}>
                        <td>
                          <div className="admin-table-primary">{ing.name_ko}</div>
                          <div className="admin-table-secondary">{ing.name_en || '영문명 미입력'}</div>
                        </td>
                        <td>
                          <RiskBadge level={ing.risk_level} />
                        </td>
                        <td>
                          <span className="admin-table-secondary-strong">{ing.category || '미분류'}</span>
                        </td>
                        <td>
                          <div className="admin-table-description">{ing.description || '설명 미입력'}</div>
                        </td>
                        <td>
                          <div className="admin-table-actions">
                            <button
                              type="button"
                              className="admin-icon-action"
                              onClick={() => { setCurrentIngredient(ing); setIsModalOpen(true); }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="admin-icon-action admin-icon-action-danger"
                              onClick={() => handleDelete(ing.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSectionCard>
        </div>

        <div className="admin-column-side">
          <AdminSectionCard
            title="운영 힌트"
            description="위험도 정의와 분류 누락을 빠르게 점검하세요."
          >
            <div className="admin-guidance-list">
              <div className="admin-guidance-item">
                <div className="admin-guidance-title">위험도 기준</div>
                <p>주의/위험 성분은 설명과 맥락을 반드시 함께 입력해 추천/리포트에 반영되게 하세요.</p>
              </div>
              <div className="admin-guidance-item">
                <div className="admin-guidance-title">분류 체계 유지</div>
                <p>단백질원, 기능성 성분, 보존료 등 카테고리를 비우지 않으면 분석 품질이 안정적으로 유지됩니다.</p>
              </div>
              <div className="admin-guidance-item">
                <div className="admin-guidance-title">최근 입력 샘플</div>
                <p>최근 정렬 기준 상단 성분 5개를 검토해 영문명/설명이 빠진 항목을 채우세요.</p>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="사전 품질 현황"
            description="카테고리와 설명 커버리지를 운영 관점에서 확인합니다."
          >
            <div className="admin-inline-stats-stack">
              <div className="admin-inline-stat">
                <div className="admin-inline-stat-label">카테고리 입력률</div>
                <div className="admin-inline-stat-value">
                  {ingredients.length ? `${((categorizedCount / ingredients.length) * 100).toFixed(1)}%` : '0%'}
                </div>
                <div className="admin-inline-stat-hint">{categorizedCount} / {ingredients.length}개</div>
              </div>
              <div className="admin-inline-stat">
                <div className="admin-inline-stat-label">주의+위험 비율</div>
                <div className="admin-inline-stat-value">
                  {ingredients.length ? `${(((cautionCount + dangerCount) / ingredients.length) * 100).toFixed(1)}%` : '0%'}
                </div>
                <div className="admin-inline-stat-hint">설명 검수 우선순위</div>
              </div>
            </div>
            <div className="admin-mini-list">
              {latestIngredients.map((item) => (
                <div key={item.id} className="admin-mini-list-item">
                  <div>
                    <div className="admin-mini-list-title">{item.name_ko}</div>
                    <div className="admin-mini-list-subtitle">{item.category || '분류 미입력'}</div>
                  </div>
                  <RiskBadge level={item.risk_level} />
                </div>
              ))}
            </div>
          </AdminSectionCard>
        </div>
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-modal-md animate-scale-in">
            <div className="admin-modal-head">
              <div>
                <div className="admin-page-eyebrow">ingredient form</div>
                <h2 className="admin-modal-title">{currentIngredient.id ? '성분 정보 수정' : '신규 성분 등록'}</h2>
              </div>
              <button type="button" className="admin-icon-action" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="admin-modal-grid-2">
              <Input label="한글 성분명*" value={currentIngredient.name_ko} onChange={(v) => setCurrentIngredient({...currentIngredient, name_ko: v})} />
              <Input label="영문 성분명" value={currentIngredient.name_en} onChange={(v) => setCurrentIngredient({...currentIngredient, name_en: v})} />
            </div>

            <div className="admin-field-block">
              <label className="admin-field-label">위험도 레벨*</label>
              <div className="admin-chip-grid-3">
                {(['safe', 'caution', 'danger'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setCurrentIngredient({...currentIngredient, risk_level: level})}
                    className={currentIngredient.risk_level === level ? 'admin-choice-chip active' : 'admin-choice-chip'}
                  >
                    {level === 'safe' ? '안전함' : level === 'caution' ? '주의' : '위험함'}
                  </button>
                ))}
              </div>
            </div>

            <Select label="성분 분류" value={currentIngredient.category} options={INGREDIENT_CATEGORIES} onChange={(v) => setCurrentIngredient({...currentIngredient, category: v})} />

            <div className="admin-field-block">
              <label className="admin-field-label">설명 및 가이드</label>
              <textarea
                className="admin-textarea"
                value={currentIngredient.description || ''}
                onChange={(e) => setCurrentIngredient({...currentIngredient, description: e.target.value})}
                rows={5}
              />
            </div>

            <div className="admin-modal-actions">
              <AdminButton variant="secondary" onClick={() => setIsModalOpen(false)}>취소</AdminButton>
              <AdminButton onClick={handleSave}>저장하기</AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function RiskBadge({ level }: { level: Ingredient['risk_level'] }) {
  if (level === 'safe') return <AdminBadge tone="emerald">안전</AdminBadge>;
  if (level === 'danger') return <AdminBadge tone="rose">위험</AdminBadge>;
  return <AdminBadge tone="amber">주의</AdminBadge>;
}

function Input({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) {
  return (
    <div className="admin-field-block">
      <label className="admin-field-label">{label}</label>
      <input
        type="text"
        className="admin-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value?: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="admin-field-block">
      <label className="admin-field-label">{label}</label>
      <select
        className="admin-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">분류 선택</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

export default AdminIngredients;
