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
        relative overflow-hidden
        gradient-border-card p-5
        group hover:shadow-[0_4px_24px_-4px_rgba(0,212,255,0.1)]
        transition-shadow duration-300
        ${className}
      `}
    >
      <p className="font-data text-[9px] font-medium text-text-muted tracking-widest uppercase mb-4">
        {label}
      </p>
      <div className="flex items-end gap-2.5">
        <p className="text-[2.25rem] leading-none font-display text-text-primary tabular-nums">
          {value}
        </p>
        {trend && (
          <span
            className={`
              inline-flex items-center gap-0.5 text-xs font-medium font-data mb-1
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
        <p className="text-xs text-text-secondary mt-1.5 font-data">{subtitle}</p>
      )}
    </div>
  );
}

export type { StatCardProps };
