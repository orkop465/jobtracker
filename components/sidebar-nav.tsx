"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
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

interface SidebarNavProps {
  userEmail?: string | null;
}

export function SidebarNav({ userEmail }: SidebarNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-surface-0/95 backdrop-blur-md border-b border-white/5">
        <Link href="/app" className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-accent" />
          <span className="font-data text-xs tracking-[0.15em] text-text-primary uppercase font-medium">
            MKV<span className="text-accent">DATA</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
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
        <div className="lg:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[200px]
          bg-surface-1 border-r border-white/5
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b border-white/5">
          <Link href="/app" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <div className="w-2.5 h-2.5 bg-accent animate-glow-pulse" />
            <span className="font-data text-xs tracking-[0.15em] text-text-primary uppercase font-medium">
              MKV<span className="text-text-muted">DATA</span>
            </span>
          </Link>
        </div>

        {/* Section label */}
        <div className="px-5 pt-6 pb-2">
          <p className="font-data text-[9px] font-medium text-text-muted tracking-[0.2em] uppercase">
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
                  relative flex items-center gap-2.5 px-3 py-2.5 rounded-[2px] text-[12px]
                  transition-all duration-150 font-data tracking-wide
                  ${
                    active
                      ? "bg-accent/8 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
                  }
                `}
              >
                {/* Active indicator */}
                <span
                  className={`absolute inset-y-1 left-0 w-[2px] transition-all duration-150 ${
                    active
                      ? "bg-accent shadow-[0_0_8px_rgba(0,212,255,0.5)]"
                      : "bg-transparent"
                  }`}
                />
                <span className={active ? "text-accent" : "text-text-muted"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5">
          {userEmail && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-accent font-data">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 bg-positive shadow-[0_0_4px_rgba(0,255,136,0.5)] flex-shrink-0" />
                <p className="text-[10px] text-text-muted truncate font-data" title={userEmail}>
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
