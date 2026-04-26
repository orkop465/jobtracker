"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-surface-0 font-bold hover:bg-accent-hover active:scale-[0.98] shadow-[0_0_16px_rgba(0,212,255,0.2)]",
  secondary:
    "bg-surface-3 text-text-primary border border-border-strong hover:bg-surface-4 active:scale-[0.98]",
  danger:
    "bg-negative-muted text-negative border border-negative/20 hover:bg-negative/20 active:scale-[0.98]",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-3 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[10px] rounded-[2px] gap-1.5",
  md: "px-5 py-2.5 text-[11px] rounded-[2px] gap-2",
  lg: "px-7 py-3 text-xs rounded-[2px] gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center
          font-data font-medium uppercase tracking-wider
          transition-all duration-200 ease-out
          focus-ring cursor-pointer
          disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-0.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
