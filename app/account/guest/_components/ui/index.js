'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

export function PageHead({ eyebrow, title, sub, actions }) {
  return (
    <div className="gp-page-head">
      <div>
        {eyebrow && <div className="gp-eyebrow">{eyebrow}</div>}
        <h1 className="gp-title">{title}</h1>
        {sub && <p className="gp-sub">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({ className = '', children, padded = true }) {
  return (
    <div className={`gp-card ${className}`}>
      {padded ? <div className="gp-card-body">{children}</div> : children}
    </div>
  );
}

export function CardHead({ icon: Icon, title, action }) {
  return (
    <div className="gp-card-head">
      <h3>
        {Icon && <Icon size={14} style={{ color: 'var(--gp-text-3)' }} />}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, unit, trend }) {
  return (
    <div className="gp-stat">
      <div className="gp-stat-label">
        {Icon && <Icon size={12} />} {label}
      </div>
      <div className="gp-stat-value">
        {value}
        {unit && <span className="gp-unit">{unit}</span>}
      </div>
      {trend && <div className="gp-stat-trend">{trend}</div>}
    </div>
  );
}

export function StatRow({ cols = 4, children }) {
  const colClass =
    cols === 2 ? 'grid-cols-1 sm:grid-cols-2'
    : cols === 3 ? 'grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4';
  return (
    <div className={`grid gap-3 sm:gap-4 mb-5 ${colClass}`}>
      {children}
    </div>
  );
}

export function Badge({ variant = '', mono = false, className = '', children }) {
  const cls = ['gp-badge', variant ? `gp-badge-${variant}` : '', mono ? 'gp-badge-mono' : '', className]
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{children}</span>;
}

export function Btn({ variant, size, as: As = 'button', href, className = '', children, ...rest }) {
  const cls = ['gp-btn', variant ? `gp-btn-${variant}` : '', size ? `gp-btn-${size}` : '', className]
    .filter(Boolean)
    .join(' ');
  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <As className={cls} {...rest}>
      {children}
    </As>
  );
}

export function Locked({ feature, children }) {
  return (
    <span className="gp-locked">
      {children}
      <span className="gp-lock-tip">
        <strong>Member-only feature</strong>
        {feature}
        <span className="gp-lock-tip-cta">Apply for membership →</span>
      </span>
    </span>
  );
}

export function LockedRow({ label, reason, applyHref = '/account/guest/membership-application' }) {
  return (
    <div className="gp-locked-row">
      <Lock size={13} style={{ color: 'var(--gp-text-4)' }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span className="gp-badge gp-badge-mono" style={{ fontSize: 9.5, padding: '1px 6px' }}>
        MEMBERS
      </span>
      <span className="gp-lock-tip">
        <strong>Member-only</strong>
        {reason}
        <Link href={applyHref} className="gp-lock-tip-cta">
          Apply for membership →
        </Link>
      </span>
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="gp-tabs">
      {items.map((t) => (
        <button
          key={t.id}
          className={`gp-tab ${value === t.id ? 'gp-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className="gp-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`gp-toggle ${on ? 'gp-on' : ''}`}
      onClick={() => !disabled && onChange(!on)}
      style={disabled ? { opacity: 0.4, cursor: 'help' } : {}}
    />
  );
}

export function UpgradeBanner({ icon: Icon, title, desc, ctaLabel = 'Apply for membership', ctaHref = '/account/guest/membership-application' }) {
  return (
    <div className="gp-upgrade">
      {Icon && (
        <div className="gp-upgrade-icon">
          <Icon size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--gp-text-3)' }}>{desc}</div>
      </div>
      <Btn href={ctaHref} variant="primary">
        {ctaLabel} →
      </Btn>
    </div>
  );
}
