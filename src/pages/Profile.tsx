import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function Profile() {
  const { profile, updateProfile } = useStore();
  const [formData, setFormData] = useState(profile);
  
  const handleSave = () => {
    updateProfile(formData);
    alert('프로필이 업데이트되었습니다!');
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter(i => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const concernOptions = ['관절', '피부', '체중', '소화', '눈'];
  const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];

  return (
    <div className="card animate-fade-in" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--primary-dark)' }}>내 아이 정보</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>이름</label>
        <input 
          type="text" 
          value={formData.name} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '16px' }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>관심 건강 (고민)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {concernOptions.map(opt => (
            <button 
              key={opt}
              onClick={() => toggleArrayItem('healthConcerns', opt)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '14px', 
                border: formData.healthConcerns.includes(opt) ? 'none' : '1px solid #E5E7EB',
                backgroundColor: formData.healthConcerns.includes(opt) ? 'var(--primary)' : 'transparent',
                color: formData.healthConcerns.includes(opt) ? '#fff' : 'var(--text-dark)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >{opt}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--danger)', marginBottom: '8px' }}>알레르기 / 회피 성분</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allergyOptions.map(opt => (
            <button 
              key={opt}
              onClick={() => toggleArrayItem('allergies', opt)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '14px', 
                border: formData.allergies.includes(opt) ? 'none' : '1px solid #E5E7EB',
                backgroundColor: formData.allergies.includes(opt) ? 'var(--danger)' : 'transparent',
                color: formData.allergies.includes(opt) ? '#fff' : 'var(--text-dark)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >{opt}</button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
        설정 저장하기
      </button>
    </div>
  );
}
