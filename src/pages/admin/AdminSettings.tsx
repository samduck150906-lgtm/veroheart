import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { notify } from '../../store/useNotification';

type SettingItem = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_SETTINGS: SettingItem[] = [
  {
    id: 'auto-report',
    title: '주간 리포트 자동 발송',
    description: '매주 월요일 운영 요약 리포트를 관리자에게 전송합니다.',
    enabled: true,
  },
  {
    id: 'new-product-alert',
    title: '신규 제품 등록 알림',
    description: '신규 제품 등록 시 운영 채널에 즉시 알림을 보냅니다.',
    enabled: true,
  },
  {
    id: 'ingredient-alert',
    title: '위험 성분 감지 알림',
    description: '위험 등급 성분 입력 시 추가 검수 플로우를 시작합니다.',
    enabled: true,
  },
  {
    id: 'maintenance',
    title: '점검 모드',
    description: '관리자가 서비스 점검 상태를 일시적으로 활성화합니다.',
    enabled: false,
  },
];

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { banners, fetchBanners, saveBanner, deleteBanner } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<any>({});

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
    notify.success('설정이 업데이트되었습니다.');
  };

  const openCreateModal = () => {
    setCurrentBanner({
      title: '',
      subtitle: '',
      imageUrl: '🥫',
      linkUrl: '/ranking',
      bgColor: 'linear-gradient(135deg, #FFF3C4 0%, #FFE066 100%)',
    });
    setIsModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!currentBanner.title) {
      notify.error('배너 타이틀은 필수입니다.');
      return;
    }
    try {
      await saveBanner(currentBanner);
      notify.success('배너가 저장되었습니다.');
      setIsModalOpen(false);
    } catch (err: any) {
      notify.error(`배너 저장 실패: ${err.message}`);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('정말 이 배너를 삭제하시겠습니까?')) return;
    try {
      await deleteBanner(id);
      notify.success('배너가 삭제되었습니다.');
    } catch (err: any) {
      notify.error(`배너 삭제 실패: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>시스템 설정 및 배너 관리</h2>
          <p>관리자 콘솔 운영 옵션 및 홈 화면 배너를 제어합니다.</p>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '16px', color: '#1E293B', fontWeight: 700 }}>운영 옵션 설정</h3>
        <div className="admin-settings-grid">
          {settings.map((setting) => (
            <article className="admin-setting-item" key={setting.id}>
              <h4>{setting.title}</h4>
              <p>{setting.description}</p>
              <button
                className={`admin-setting-toggle ${setting.enabled ? 'active' : ''}`}
                onClick={() => toggleSetting(setting.id)}
              >
                {setting.enabled ? '활성화됨' : '비활성화됨'}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#1E293B', fontWeight: 700, margin: 0 }}>홈 화면 배너 관리</h3>
          <button className="admin-btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            신규 배너 추가
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>미리보기</th>
                <th>타이틀</th>
                <th>서브타이틀</th>
                <th>이동 링크</th>
                <th style={{ textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="admin-empty">등록된 배너가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{
                        width: '120px',
                        height: '50px',
                        borderRadius: '8px',
                        background: b.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        color: '#1E293B',
                        padding: '4px 10px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        textAlign: 'center',
                        fontWeight: 700,
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ fontSize: '14px', marginRight: '4px' }}>{b.imageUrl?.length <= 2 ? b.imageUrl : '🖼️'}</span>
                        <span style={{ fontSize: '9px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{b.title}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{b.title}</div>
                    </td>
                    <td>
                      <div style={{ color: '#64748B', fontSize: '13px' }}>{b.subtitle}</div>
                    </td>
                    <td>
                      <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{b.linkUrl}</code>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-actions">
                        <button
                          className="admin-icon-btn edit"
                          onClick={() => {
                            setCurrentBanner(b);
                            setIsModalOpen(true);
                          }}
                          aria-label="배너 수정"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="admin-icon-btn delete"
                          onClick={() => handleDeleteBanner(b.id)}
                          aria-label="배너 삭제"
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
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{currentBanner.id ? '배너 수정' : '신규 배너 등록'}</h3>
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)} aria-label="모달 닫기">
                <X size={16} />
              </button>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group admin-form-span-2">
                <label>배너 타이틀* (줄바꿈은 \n 또는 실제 엔터)</label>
                <textarea
                  value={currentBanner.title || ''}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
                  style={{
                    width: '100%', height: '60px', padding: '10px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical'
                  }}
                  placeholder="예: 지금 꼭 챙겨야 할\n영양 맞춤 사료 라인업"
                />
              </div>

              <InputField
                label="서브타이틀"
                value={currentBanner.subtitle}
                onChange={(value) => setCurrentBanner({ ...currentBanner, subtitle: value })}
              />

              <InputField
                label="이동 링크 URL (예: /ranking, /search)"
                value={currentBanner.linkUrl}
                onChange={(value) => setCurrentBanner({ ...currentBanner, linkUrl: value })}
              />

              <InputField
                label="이미지 (이모지 또는 이미지 URL)"
                value={currentBanner.imageUrl}
                onChange={(value) => setCurrentBanner({ ...currentBanner, imageUrl: value })}
              />

              <InputField
                label="배경 그라데이션 / 색상 (CSS)"
                value={currentBanner.bgColor}
                onChange={(value) => setCurrentBanner({ ...currentBanner, bgColor: value })}
                placeholder="예: linear-gradient(135deg, #FFF3C4 0%, #FFE066 100%)"
              />
            </div>

            <div className="admin-modal-footer">
              <button className="admin-btn-soft" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button className="admin-btn-primary" onClick={handleSaveBanner}>
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
  placeholder,
  className,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`admin-form-group ${className || ''}`}>
      <label>{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default AdminSettings;
