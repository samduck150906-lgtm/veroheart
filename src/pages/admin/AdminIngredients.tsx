import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Database
} from 'lucide-react';
import { notify } from '../../store/useNotification';
import standardFeedData from '../../data/standard_feed_data.json';

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
  const [isStandardFeedModalOpen, setIsStandardFeedModalOpen] = useState(false);
  const [standardFeedSearch, setStandardFeedSearch] = useState('');
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

  const filteredStandardFeed = standardFeedData.filter((item: any) =>
    item.name_ko.toLowerCase().includes(standardFeedSearch.toLowerCase()) ||
    item.name_en.toLowerCase().includes(standardFeedSearch.toLowerCase())
  );

  const handleSelectStandardFeed = (item: any) => {
    setCurrentIngredient({
      ...currentIngredient,
      name_ko: item.name_ko,
      name_en: item.name_en,
      description: `수분: ${item.moisture}% / 조단백질: ${item.protein}% / 조지방: ${item.fat}% / 조회분: ${item.ash}% / 조섬유: ${item.fiber}% (출처: 한국표준사료성분표 2022)`,
      risk_level: 'safe'
    });
    setIsStandardFeedModalOpen(false);
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'safe': return '#10B981';
      case 'caution': return '#F59E0B';
      case 'danger': return '#EF4444';
      default: return '#6B7280';
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
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '32px', padding: '40px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{currentIngredient.id ? '성분 정보 수정' : '신규 성분 등록'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {!currentIngredient.id && (
              <div style={{ marginBottom: '24px' }}>
                <button 
                  onClick={() => setIsStandardFeedModalOpen(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: '16px', backgroundColor: '#F3F4F6', border: '1px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, color: '#4B5563', cursor: 'pointer' }}
                >
                  <Database size={18} /> 한국표준사료성분표 데이터에서 불러오기
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InputField label="한글 성분명*" value={currentIngredient.name_ko} onChange={(v) => setCurrentIngredient({...currentIngredient, name_ko: v})} />
                <InputField label="영문 성분명" value={currentIngredient.name_en} onChange={(v) => setCurrentIngredient({...currentIngredient, name_en: v})} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '12px' }}>위험도 레벨*</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['safe', 'caution', 'danger'].map(level => (
                    <button
                      key={level}
                      onClick={() => setCurrentIngredient({...currentIngredient, risk_level: level as any})}
                      style={{
                        flex: 1, padding: '16px', borderRadius: '16px', border: '2px solid',
                        transition: '0.2s', cursor: 'pointer', fontSize: '14px', fontWeight: 800,
                        backgroundColor: currentIngredient.risk_level === level ? `${getRiskColor(level)}` : '#fff',
                        borderColor: currentIngredient.risk_level === level ? getRiskColor(level) : '#E5E7EB',
                        color: currentIngredient.risk_level === level ? '#fff' : '#6B7280'
                      }}
                    >
                      {level === 'safe' ? '안전함' : (level === 'caution' ? '주의' : '위험함')}
                    </button>
                  ))}
                </div>
              </div>

              <SelectField label="성분 분류" value={currentIngredient.category} options={INGREDIENT_CATEGORIES} onChange={(v) => setCurrentIngredient({...currentIngredient, category: v})} />

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>설명 및 가이드</label>
                <textarea 
                  value={currentIngredient.description || ''} 
                  onChange={(e) => setCurrentIngredient({...currentIngredient, description: e.target.value})}
                  rows={4}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', outline: 'none', resize: 'none' }}
                />
              </div>
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

      {/* Standard Feed Modal */}
      {isStandardFeedModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '32px', padding: '40px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900 }}>한국표준사료성분 DB 검색</h2>
              <button onClick={() => setIsStandardFeedModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                placeholder="성분명 검색..." 
                value={standardFeedSearch}
                onChange={(e) => setStandardFeedSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '14px' }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              {filteredStandardFeed.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>검색 결과가 없습니다.</div>
              ) : (
                filteredStandardFeed.map((item: any, idx: number) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectStandardFeed(item)}
                    style={{ 
                      padding: '16px', borderBottom: '1px solid #E5E7EB', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}
                    className="hover:bg-gray-50"
                  >
                    <div style={{ fontWeight: 800, color: '#1F2937' }}>{item.name_ko}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{item.name_en}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                      단백질: {item.protein}% | 지방: {item.fat}% | 수분: {item.moisture}% | 회분: {item.ash}%
                    </div>
                  </div>
                ))
              )}
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
