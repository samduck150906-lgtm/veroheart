import React, { useState } from 'react';

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

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>시스템 설정</h2>
          <p>관리자 콘솔 운영 옵션을 제어합니다.</p>
        </div>
      </div>

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
  );
};

export default AdminSettings;
