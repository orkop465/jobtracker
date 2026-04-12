"use client";

interface BoardHeaderProps {
  totalApps: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddClick: () => void;
  onManageClick: () => void;
}

export function BoardHeader({
  totalApps,
  searchQuery,
  onSearchChange,
  onAddClick,
  onManageClick,
}: BoardHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Title area */}
      <div className="flex-shrink-0">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)] flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          Pipeline
        </div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Applications
        </h1>
        <p className="font-mono text-[10px] tabular-nums text-[var(--color-ink-muted)] mt-0.5">
          {totalApps} total
        </p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="w-[240px]">
        <input
          type="text"
          placeholder="Search company or role..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-md text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]/10 transition-colors duration-[180ms] font-sans"
        />
      </div>

      {/* Actions */}
      <button
        onClick={onManageClick}
        className="px-3 py-2 text-[12px] font-mono tracking-wide text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)] rounded-md hover:bg-[var(--color-surface)] transition-colors duration-[180ms]"
      >
        Manage
      </button>
      <button
        onClick={onAddClick}
        className="px-4 py-2 text-[12px] font-mono tracking-wide text-[var(--color-surface)] bg-[var(--color-ink)] rounded-md hover:bg-[var(--color-ink)]/90 transition-colors duration-[180ms]"
      >
        + Add
      </button>
    </div>
  );
}
