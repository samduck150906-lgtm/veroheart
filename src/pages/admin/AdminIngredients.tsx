import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  AlertOctagon,
  X,
  Check,
  FlaskConical,
  ExternalLink
} from 'lucide-react';
import { notify } from '../../store/useNotification';

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

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'safe': return '#10B981';
      case 'caution': return '#F59E0B';
      case 'danger': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="admin-ingredients animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#111827' }}>성분 사전 관리</h1>
          <p style={{ color: '#6B7280', marginTop: '4px' }}>총 {ingredients.length}개의 분석용 성분 데이터가 등록되어 있습니다.</p>
        </div>
        <button 
          onClick={() => { setCurrentIngredient({ risk_level: 'safe' }); setIsModalOpen(true); }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', background: '#059669', color: '#fff', 
            padding: '12px 24px', borderRadius: '14px', border: 'none', fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.4)'
          }}
        >
          <Plus size={20} /> 신규 성분 등록
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <StatSmallCard label="안전 성분" value={ingredients.filter(i => i.risk_level === 'safe').length} color="#10B981" />
        <StatSmallCard label="주의 성분" value={ingredients.filter(i => i.risk_level === 'caution').length} color="#F59E0B" />
        <StatSmallCard label="위험 성분" value={ingredients.filter(i => i.risk_level === 'danger').length} color="#EF4444" />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input 
            type="text" 
            placeholder="성분명(한글/영문)으로 검색하세요..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '15px' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>성분명 (한글/영문)</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>위험도</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>분류</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '13px', color: '#6B7280' }}>설명</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>데이터를 불러오는 중...</td></tr>
            ) : filteredIngredients.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px 0', color: '#9CA3AF' }}>검색 결과가 없습니다.</td></tr>
            ) : (
              filteredIngredients.map((ing) => (
                <tr key={ing.id} style={{ borderBottom: '1px solid #F3F4F6' }} className="hover:bg-gray-50">
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 800, color: '#1F2937' }}>{ing.name_ko}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{ing.name_en || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
                      backgroundColor: `${getRiskColor(ing.risk_level)}10`, color: getRiskColor(ing.risk_level)
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getRiskColor(ing.risk_level) }} />
                      {ing.risk_level === 'safe' ? '안전' : (ing.risk_level === 'caution' ? '주의' : '위험')}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>{ing.category || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ing.description || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setCurrentIngredient(ing); setIsModalOpen(true); }} style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#4B5563' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(ing.id)} style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
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
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '32px', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{currentIngredient.id ? '성분 정보 수정' : '신규 성분 등록'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input label="한글 성분명*" value={currentIngredient.name_ko} onChange={(v) => setCurrentIngredient({...currentIngredient, name_ko: v})} />
                <Input label="영문 성분명" value={currentIngredient.name_en} onChange={(v) => setCurrentIngredient({...currentIngredient, name_en: v})} />
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

              <Select label="성분 분류" value={currentIngredient.category} options={INGREDIENT_CATEGORIES} onChange={(v) => setCurrentIngredient({...currentIngredient, category: v})} />

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

            <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '16px', borderRadius: '16px', backgroundColor: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatSmallCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', fontWeight: 700, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: '20px', fontWeight: 900, color: color }}>{value.toLocaleString()}</span>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
      <input 
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid #E5E7EB', outline: 'none' }}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value?: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid #E5E7EB', outline: 'none', backgroundColor: '#fff' }}
      >
        <option value="">분류 선택</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

export default AdminIngredients;
