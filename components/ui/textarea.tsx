"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  charCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, charCount, maxLength, value, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary tracking-wide uppercase">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          className={`
            w-full bg-surface-1 text-text-primary
            border border-border rounded-lg
            px-3 py-2.5 text-sm leading-relaxed
            placeholder:text-text-muted
            transition-colors duration-150
            focus-ring resize-y min-h-[80px]
            hover:border-border-strong
            focus:border-accent/40
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? "border-negative/50 focus:border-negative" : ""}
            ${className}
          `}
          {...props}
        />
        <div className="flex items-center justify-between">
          {error && <p className="text-xs text-negative">{error}</p>}
          {charCount && maxLength && (
            <p className={`text-xs ml-auto font-mono ${currentLength > maxLength * 0.9 ? "text-warning" : "text-text-muted"}`}>
              {currentLength.toLocaleString()}/{maxLength.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
export type { TextareaProps };
