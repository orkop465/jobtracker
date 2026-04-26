"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className = "" }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3
        bg-negative-muted border border-negative/20 rounded-lg
        text-sm text-negative
        animate-fade-in
        ${className}
      `}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5.5v3M8 10.5v0" />
      </svg>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l6 6M10 4l-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

export type { ErrorBannerProps };
