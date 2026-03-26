"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary tracking-wide uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full bg-surface-1 text-text-primary
            border border-border rounded-lg
            px-3 py-2.5 text-sm
            placeholder:text-text-muted
            transition-colors duration-150
            focus-ring
            hover:border-border-strong
            focus:border-accent/40
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? "border-negative/50 focus:border-negative" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-negative mt-0.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
export type { InputProps };
