"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="5" height="5" rx="0.5" />
        <rect x="8" y="1" width="5" height="5" rx="0.5" />
        <rect x="1" y="8" width="5" height="5" rx="0.5" />
        <rect x="8" y="8" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  {
    href: "/app/applications",
    label: "Applications",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h10M2 7h10M2 10h7" />
      </svg>
    ),
  },
  {
    href: "/app/resumes",
    label: "Resumes",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 1h5l3 3v8.5a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" />
        <path d="M9 1v3h3" />
      </svg>
    ),
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11V6M7 11V3M11 11V8" />
      </svg>
    ),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="5" r="2.5" />
        <path d="M2.5 13c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      </svg>
    ),
  },
];

export function SidebarNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-line)]">
        <Link href="/app" className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink)] font-medium">
            mkvdata
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors duration-[180ms]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4.5h12M2 8h12M2 11.5h12" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[200px]
          bg-[var(--color-surface)] border-r border-[var(--color-line)]
          flex flex-col
          transition-transform duration-200
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="px-5 h-16 flex items-center border-b border-[var(--color-line)]">
          <Link
            href="/app"
            className="flex items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink)]" />
            <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--color-ink)] font-medium">
              mkvdata
            </span>
          </Link>
        </div>

        {/* Section label */}
        <div className="px-5 pt-6 pb-2">
          <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            Navigate
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[12px]
                  transition-colors duration-[180ms] font-mono tracking-wide
                  ${
                    active
                      ? "bg-[var(--color-canvas)] text-[var(--color-ink)] font-medium"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
                  }
                `}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--color-ink)]" />
                )}
                <span
                  className={
                    active
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)]"
                  }
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-[var(--color-line)]">
          {userEmail && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[var(--color-canvas)] border border-[var(--color-line)] flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-semibold text-[var(--color-ink)] font-mono">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-survive)]" />
                <p
                  className="text-[10px] text-[var(--color-ink-muted)] truncate font-mono"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
