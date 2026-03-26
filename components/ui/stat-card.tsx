"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label?: string };
  className?: string;
}

export function StatCard({ label, value, subtitle, trend, className = "" }: StatCardProps) {
  return (
    <div
      className={`
        relative bg-surface-1 border border-border rounded-xl p-4
        noise-texture overflow-hidden
        ${className}
      `}
    >
      <p className="text-xs font-medium text-text-muted tracking-wide uppercase mb-2">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-text-primary tracking-tight font-[family-name:var(--font-geist-mono)]">
          {value}
        </p>
        {trend && (
          <span
            className={`
              inline-flex items-center gap-0.5 text-xs font-medium mb-1
              ${trend.value > 0 ? "text-positive" : trend.value < 0 ? "text-negative" : "text-text-muted"}
            `}
          >
            {trend.value > 0 ? "\u2191" : trend.value < 0 ? "\u2193" : "\u2192"}
            {Math.abs(trend.value)}%
            {trend.label && <span className="text-text-muted ml-0.5">{trend.label}</span>}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      )}
      {/* Subtle accent glow for emphasis */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-accent/[0.03] blur-2xl pointer-events-none" />
    </div>
  );
}

export type { StatCardProps };
