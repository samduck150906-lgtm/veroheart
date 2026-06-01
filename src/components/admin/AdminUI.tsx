import type { CSSProperties, ReactNode } from 'react';
import { Search } from 'lucide-react';

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-header">
      <div>
        {eyebrow && <div className="admin-page-eyebrow">{eyebrow}</div>}
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-description">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}

type AdminSectionCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
  style,
}: AdminSectionCardProps) {
  return (
    <section className={`admin-section-card${className ? ` ${className}` : ''}`} style={style}>
      {(title || description || action) && (
        <div className="admin-section-head">
          <div>
            {title && <h2 className="admin-section-title">{title}</h2>}
            {description && <p className="admin-section-description">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type AdminMetricCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon: ReactNode;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  footnote?: string;
};

export function AdminMetricCard({
  label,
  value,
  delta,
  icon,
  tone = 'slate',
  footnote,
}: AdminMetricCardProps) {
  return (
    <div className={`admin-metric-card admin-tone-${tone}`}>
      <div className="admin-metric-top">
        <div className="admin-metric-icon">{icon}</div>
        {delta && <span className="admin-metric-delta">{delta}</span>}
      </div>
      <div className="admin-metric-label">{label}</div>
      <div className="admin-metric-value">{value}</div>
      {footnote && <div className="admin-metric-footnote">{footnote}</div>}
    </div>
  );
}

type AdminInlineStatProps = {
  label: string;
  value: string;
  hint?: string;
};

export function AdminInlineStat({ label, value, hint }: AdminInlineStatProps) {
  return (
    <div className="admin-inline-stat">
      <div className="admin-inline-stat-label">{label}</div>
      <div className="admin-inline-stat-value">{value}</div>
      {hint && <div className="admin-inline-stat-hint">{hint}</div>}
    </div>
  );
}

type AdminToolbarProps = {
  left: ReactNode;
  right?: ReactNode;
};

export function AdminToolbar({ left, right }: AdminToolbarProps) {
  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-left">{left}</div>
      {right && <div className="admin-toolbar-right">{right}</div>}
    </div>
  );
}

type AdminSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function AdminSearchField({ value, onChange, placeholder }: AdminSearchFieldProps) {
  return (
    <label className="admin-search-field">
      <Search size={18} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

type AdminButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: CSSProperties;
  type?: 'button' | 'submit';
};

export function AdminButton({
  children,
  onClick,
  variant = 'primary',
  style,
  type = 'button',
}: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`admin-btn admin-btn-${variant}`}
      style={style}
    >
      {children}
    </button>
  );
}

type AdminBadgeProps = {
  children: ReactNode;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
};

export function AdminBadge({ children, tone = 'slate' }: AdminBadgeProps) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}

type AdminEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-title">{title}</div>
      <p className="admin-empty-description">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
