'use client';

import { forwardRef } from 'react';
import { COMPANY_TEMPLATES } from '@/lib/landing/company-templates';

interface CompanyCardProps {
  templateIndex: number;
  /** Ghost = card is currently transiting (rendered as a placeholder). */
  ghost?: boolean;
  /** Arriving = card just landed here (brief highlight). */
  arriving?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A single company card displayed inside a stage column, or the card template
 * used by a FlyingCard overlay. Uses forwardRef so the flying card layer can
 * mutate its transform directly.
 */
export const CompanyCard = forwardRef<HTMLDivElement, CompanyCardProps>(
  function CompanyCard({ templateIndex, ghost, arriving, className = '', style }, ref) {
    const template = COMPANY_TEMPLATES[templateIndex % COMPANY_TEMPLATES.length];
    return (
      <div
        ref={ref}
        className={[
          'bg-white border border-[var(--color-line)] rounded-[5px] px-2 py-1.5 text-[10px] leading-tight',
          'shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
          ghost && 'opacity-30 border-dashed bg-transparent',
          arriving && 'border-[var(--color-survive)] shadow-[0_0_0_2px_rgba(21,128,61,0.1)]',
          'transition-[border-color,box-shadow] duration-[180ms]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        <div className="font-semibold text-[var(--color-ink)]">{template.company}</div>
        <div className="text-[9px] text-[var(--color-ink-muted)] mt-[1px]">{template.role}</div>
      </div>
    );
  },
);
