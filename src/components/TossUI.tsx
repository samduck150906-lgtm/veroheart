import type { CSSProperties, ReactNode } from 'react';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';

type TossCardProps = {
  children: ReactNode;
  style?: CSSProperties;
};

export function TossCard({ children, style }: TossCardProps) {
  return (
    <section
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'none',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

type TossButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'primary' | 'soft' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
};

export function TossButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
}: TossButtonProps) {
  const sizeStyle =
    size === 'sm'
      ? { height: '38px', fontSize: '12px', borderRadius: '12px', padding: '0 12px' }
      : size === 'lg'
        ? { height: '50px', fontSize: '15px', borderRadius: '16px', padding: '0 16px' }
        : { height: '46px', fontSize: '14px', borderRadius: '14px', padding: '0 14px' };

  const palette =
    variant === 'primary'
      ? {
          background: 'var(--text-dark)',
          color: '#FFFFFF',
          border: '1px solid transparent',
        }
      : variant === 'soft'
        ? {
            background: 'var(--surface-muted)',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-subtle)',
          }
        : {
            background: '#FFFFFF',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-strong)',
          };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        ...sizeStyle,
        ...palette,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

type TossChipProps = {
  label?: string;
  children?: ReactNode;
  selected?: boolean;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  style?: CSSProperties;
};

export function TossChip({
  label,
  children,
  selected = false,
  active,
  onClick,
  size = 'md',
  style,
}: TossChipProps) {
  const isActive = active ?? selected;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: size === 'sm' ? '6px 10px' : '8px 12px',
        borderRadius: '999px',
        border: isActive ? '1px solid var(--text-dark)' : '1px solid var(--border-subtle)',
        background: isActive ? 'var(--text-dark)' : 'var(--surface-elevated)',
        color: isActive ? '#FFFFFF' : 'var(--text-muted)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
        }
      }}
    >
      {children ?? label}
    </button>
  );
}

type TossSectionTitleProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: CSSProperties;
};

export function TossSectionTitle({ title, subtitle, right, style }: TossSectionTitleProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', ...style }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#292524', lineHeight: 1.35 }}>{title}</h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 500, color: '#78716c' }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

type TossFieldProps = {
  label?: string;
  children: ReactNode;
  helperText?: string;
  icon?: ReactNode;
  style?: CSSProperties;
};

export function TossField({ label, children, helperText, icon, style }: TossFieldProps) {
  return (
    <div style={{ marginBottom: '14px', ...style }}>
      {(label || icon) && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#44403c', marginBottom: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {icon}
            {label}
          </span>
        </label>
      )}
      {children}
      {helperText && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8B95A1', fontWeight: 600, lineHeight: 1.45 }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

type TossSectionBlockProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: CSSProperties;
};

export function TossSectionBlock({ title, subtitle, children, style }: TossSectionBlockProps) {
  return (
    <TossCard style={{ padding: '16px', ...style }}>
      <TossSectionTitle title={title} subtitle={subtitle} style={{ marginBottom: '12px' }} />
      {children}
    </TossCard>
  );
}

type TossFilterSectionProps = {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
};

export function TossFilterSection({ title, children, style }: TossFilterSectionProps) {
  return (
    <div style={{ marginBottom: '14px', ...style }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.03em' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

type TossSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  rightSlot?: ReactNode;
};

type TossInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
};

export function TossSearchBar({
  value,
  onChange,
  placeholder = '검색어를 입력하세요',
  onFilterClick,
  rightSlot,
}: TossSearchBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid rgba(28, 25, 23, 0.08)',
        boxShadow: '0 1px 2px rgba(28, 25, 23, 0.05)',
        padding: '12px 14px',
      }}
    >
      <SearchIcon size={18} color="#8B95A1" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          width: '100%',
          marginLeft: '10px',
          fontSize: '15px',
          color: '#1F2937',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <X size={16} color="#8B95A1" />
        </button>
      )}
      {rightSlot}
      {onFilterClick && (
        <button
          type="button"
          onClick={onFilterClick}
          style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B7684' }}
          aria-label="필터 열기"
        >
          <SlidersHorizontal size={18} />
        </button>
      )}
    </div>
  );
}

export function TossInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  disabled = false,
  style,
}: TossInputProps) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '13px 14px',
        borderRadius: '12px',
        border: '1px solid #E5E8EB',
        fontSize: '15px',
        outline: 'none',
        background: disabled ? '#F9FAFB' : '#FFFFFF',
        color: '#1F2937',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}
