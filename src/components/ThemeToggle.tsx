import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { getThemeMode, cycleThemeMode, subscribeSystemTheme, type ThemeMode } from '../lib/theme';

/** 헤더 테마 토글 — system → light → dark 순환. */
export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => subscribeSystemTheme(() => setMode(getThemeMode())), []);

  const meta =
    mode === 'dark'
      ? { Icon: Moon, label: '다크 모드' }
      : mode === 'light'
        ? { Icon: Sun, label: '라이트 모드' }
        : { Icon: Monitor, label: '시스템 테마' };
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      className="app-icon-button"
      onClick={() => setMode(cycleThemeMode())}
      aria-label={`테마 전환 (현재: ${meta.label})`}
      title={meta.label}
    >
      <Icon size={18} />
    </button>
  );
}
