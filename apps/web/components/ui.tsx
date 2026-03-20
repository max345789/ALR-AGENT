'use client';

import React from 'react';

function classNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

// ─── Card ───────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={classNames(
        'flex h-full flex-col rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,244,248,0.9))] p-6 text-slate-900 shadow-[0_24px_70px_rgba(47,58,72,0.08)] backdrop-blur-[22px] transition-[transform,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        hover && 'hover:-translate-y-0.5 hover:shadow-[0_30px_84px_rgba(47,58,72,0.12)]',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'info';

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-700',
  accent: 'border-slate-200 bg-[linear-gradient(135deg,rgba(234,111,74,0.16),rgba(122,160,212,0.12))] text-slate-700',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700'
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md',
        BADGE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  deltaPositive,
  className = ''
}: MetricCardProps) {
  return (
    <Card className={classNames('min-h-[8.5rem] justify-between', className)}>
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none text-slate-500">{label}</p>
        <p className="text-[clamp(1.8rem,3vw,2.1rem)] font-bold tracking-tight leading-none tabular-nums text-slate-900">
          {value}
        </p>
        {delta && (
          <p className={classNames('text-xs font-medium', deltaPositive ? 'text-emerald-600' : 'text-rose-600')}>
            {deltaPositive ? '↑' : '↓'} {delta}
          </p>
        )}
      </div>
      {hint && <p className="pt-4 text-xs leading-5 text-slate-400">{hint}</p>}
    </Card>
  );
}

// ─── ActionButton ────────────────────────────────────────────────────────────

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  success?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_STYLES: Record<NonNullable<ActionButtonProps['size']>, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base'
};

export function ActionButton({
  variant = 'primary',
  loading = false,
  success = false,
  size = 'md',
  children,
  className = '',
  disabled,
  type,
  ...props
}: ActionButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const baseStyle =
    'relative inline-flex items-center justify-center rounded-full p-px font-semibold transition-[transform,box-shadow,filter,background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 active:translate-y-px active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60';

  const outerStyle =
    variant === 'primary'
      ? 'bg-[linear-gradient(135deg,rgba(54,66,84,0.98),rgba(89,103,129,0.96),rgba(234,111,74,0.72))] shadow-[0_16px_34px_rgba(47,58,72,0.16)] hover:shadow-[0_20px_42px_rgba(47,58,72,0.2)]'
      : variant === 'secondary'
        ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,244,248,0.92))] shadow-[0_12px_30px_rgba(47,58,72,0.1)] hover:shadow-[0_16px_36px_rgba(47,58,72,0.14)]'
        : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.64),rgba(241,244,248,0.5))] shadow-[0_8px_24px_rgba(47,58,72,0.06)] hover:shadow-[0_12px_28px_rgba(47,58,72,0.08)]';

  const innerStyle =
    variant === 'primary'
      ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,250,0.92))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]'
      : variant === 'secondary'
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,250,0.92))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]'
        : 'bg-white/72 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]';

  const sizeStyle = SIZE_STYLES[size];

  return (
    <button
      type={type ?? 'button'}
      disabled={isDisabled}
      className={classNames(baseStyle, outerStyle, className)}
      {...props}
    >
      <span
        className={classNames(
          'inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full leading-none transition-colors duration-300',
          innerStyle,
          sizeStyle
        )}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : success ? (
          '✓ Done'
        ) : (
          children
        )}
      </span>
    </button>
  );
}
