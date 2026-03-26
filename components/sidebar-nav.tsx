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
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5.5" height="5.5" rx="1" />
        <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" />
        <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" />
        <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/app/applications",
    label: "Applications",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h12M3 9h12M3 13h8" />
      </svg>
    ),
  },
  {
    href: "/app/resumes",
    label: "Resumes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2h6l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M11 2v4h4" />
        <path d="M7 10h4M7 13h2" />
      </svg>
    ),
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14V8M9 14V4M14 14V10" />
      </svg>
    ),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="6.5" r="3" />
        <path d="M3 16.5c0-3.314 2.686-6 6-6s6 2.686 6 6" />
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-surface-0/90 backdrop-blur-md border-b border-border">
        <Link href="/app" className="flex items-center gap-2 text-text-primary font-semibold text-sm tracking-tight">
          <span className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-[10px] font-bold text-surface-0">JT</span>
          JobTracker
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[220px]
          bg-surface-0 border-r border-border
          flex flex-col
          transition-transform duration-200 ease-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <Link href="/app" className="flex items-center gap-2.5 text-text-primary font-semibold text-sm tracking-tight" onClick={() => setMobileOpen(false)}>
            <span className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-surface-0 shadow-[0_0_12px_rgba(45,212,191,0.25)]">
              JT
            </span>
            <span>JobTracker</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${
                    active
                      ? "bg-accent-muted text-accent-text border border-accent/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
                  }
                `}
              >
                <span className={active ? "text-accent" : "text-text-muted"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer / user info */}
        <div className="px-4 py-4 border-t border-border">
          {userEmail && (
            <p className="text-xs text-text-muted truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
