import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
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
  '단백질원',
  '탄수화물원',
  '지방원',
  '비타민·미네랄',
  '기능성 성분',
  '보존료·산화방지제',
  '유산균',
  '기타',
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

    if (error) {
      notify.error(`성분 조회 실패: ${error.message}`);
      setLoading(false);
      return;
    }

    setIngredients((data || []) as Ingredient[]);
    setLoading(false);
  };

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(
      (ingredient) =>
        ingredient.name_ko.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.name_en?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ingredients, searchTerm]);

  const stats = useMemo(
    () => ({
      safe: ingredients.filter((ingredient) => ingredient.risk_level === 'safe').length,
      caution: ingredients.filter((ingredient) => ingredient.risk_level === 'caution').length,
      danger: ingredients.filter((ingredient) => ingredient.risk_level === 'danger').length,
    }),
    [ingredients]
  );

  const handleSave = async () => {
    if (!currentIngredient.name_ko || !currentIngredient.risk_level) {
      notify.error('한글 성분명과 위험도는 필수입니다.');
      return;
    }

    const payload = {
      ...currentIngredient,
      name_ko: (currentIngredient.name_ko || '').trim(),
      name_en: (currentIngredient.name_en || '').trim(),
      description: (currentIngredient.description || '').trim(),
      category: (currentIngredient.category || '').trim(),
    };

    try {
      if (currentIngredient.id) {
        const { error } = await supabase.from('ingredients').update(payload).eq('id', currentIngredient.id);
        if (error) throw error;
        notify.success('성분 정보가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('ingredients').insert([payload]);
        if (error) throw error;
        notify.success('신규 성분이 등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchIngredients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify.error(`저장 실패: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 이 성분을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) {
      notify.error(`삭제 실패: ${error.message}`);
      return;
    }
    notify.success('성분이 삭제되었습니다.');
    fetchIngredients();
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>성분 사전 관리</h2>
          <p>총 {ingredients.length.toLocaleString()}개 성분</p>
        </div>
        <button
          className="admin-btn-primary"
          onClick={() => {
            setCurrentIngredient({ risk_level: 'safe' });
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} />
          신규 성분 등록
        </button>
      </div>

      <div className="admin-grid-cards" style={{ marginBottom: 14 }}>
        <article className="admin-card">
          <span className="admin-stat-label">안전 성분</span>
          <div className="admin-stat-value" style={{ color: '#16a34a' }}>
            {stats.safe.toLocaleString()}
          </div>
        </article>
        <article className="admin-card">
          <span className="admin-stat-label">주의 성분</span>
          <div className="admin-stat-value" style={{ color: '#ea580c' }}>
            {stats.caution.toLocaleString()}
          </div>
        </article>
        <article className="admin-card">
          <span className="admin-stat-label">위험 성분</span>
          <div className="admin-stat-value" style={{ color: '#dc2626' }}>
            {stats.danger.toLocaleString()}
          </div>
        </article>
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="성분명(한글/영문) 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>성분명</th>
              <th>위험도</th>
              <th>분류</th>
              <th>설명</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">표시할 성분이 없습니다.</div>
                </td>
              </tr>
            ) : (
              filteredIngredients.map((ingredient) => (
                <tr key={ingredient.id}>
                  <td>
                    <div className="admin-item-main">{ingredient.name_ko}</div>
                    <div className="admin-item-sub">{ingredient.name_en || '-'}</div>
                  </td>
                  <td>
                    <span
                      className={`admin-tag ${
                        ingredient.risk_level === 'safe'
                          ? 'green'
                          : ingredient.risk_level === 'caution'
                          ? 'orange'
                          : 'red'
                      }`}
                    >
                      {ingredient.risk_level === 'safe'
                        ? '안전'
                        : ingredient.risk_level === 'caution'
                        ? '주의'
                        : '위험'}
                    </span>
                  </td>
                  <td>{ingredient.category || '-'}</td>
                  <td>{ingredient.description || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions">
                      <button
                        className="admin-icon-btn edit"
                        onClick={() => {
                          setCurrentIngredient(ingredient);
                          setIsModalOpen(true);
                        }}
                        aria-label="성분 수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="admin-icon-btn delete"
                        onClick={() => handleDelete(ingredient.id)}
                        aria-label="성분 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{currentIngredient.id ? '성분 정보 수정' : '신규 성분 등록'}</h3>
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)} aria-label="모달 닫기">
                <X size={16} />
              </button>
            </div>

            <div className="admin-form-grid">
              <InputField
                label="한글 성분명*"
                value={currentIngredient.name_ko}
                onChange={(value) => setCurrentIngredient({ ...currentIngredient, name_ko: value })}
              />
              <InputField
                label="영문 성분명"
                value={currentIngredient.name_en}
                onChange={(value) => setCurrentIngredient({ ...currentIngredient, name_en: value })}
              />
              <SelectField
                label="위험도*"
                value={currentIngredient.risk_level}
                options={['safe', 'caution', 'danger']}
                onChange={(value) =>
                  setCurrentIngredient({ ...currentIngredient, risk_level: value as Ingredient['risk_level'] })
                }
              />
              <SelectField
                label="성분 분류"
                value={currentIngredient.category}
                options={INGREDIENT_CATEGORIES}
                onChange={(value) => setCurrentIngredient({ ...currentIngredient, category: value })}
              />
              <TextAreaField
                className="admin-form-span-2"
                label="설명 및 가이드"
                value={currentIngredient.description}
                onChange={(value) => setCurrentIngredient({ ...currentIngredient, description: value })}
              />
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button className="admin-btn-primary" onClick={handleSave}>
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">선택하세요</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`admin-form-group ${className || ''}`}>
      <label>{label}</label>
      <textarea rows={4} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default AdminIngredients;
