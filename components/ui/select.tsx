"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[10px] font-medium text-text-muted tracking-[0.1em] uppercase font-data">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full bg-surface-1 text-text-primary
            border border-border rounded-md
            px-3 py-2.5 text-sm
            transition-colors duration-150
            focus-ring cursor-pointer appearance-none
            hover:border-border-strong
            focus:border-accent/40
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239898a6%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E')]
            bg-no-repeat bg-[right_12px_center]
            pr-9
            ${error ? "border-negative/50 focus:border-negative" : ""}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-text-muted">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-negative mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export { Select };
export type { SelectProps, SelectOption };
