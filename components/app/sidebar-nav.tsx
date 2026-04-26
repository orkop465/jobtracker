"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/app", icon: "dashboard" },
  { id: "board", label: "Board", href: "/app/applications", icon: "board" },
  { id: "analytics", label: "Analytics", href: "/app/analytics", icon: "analytics" },
  { id: "resumes", label: "Resumes", href: "/app/resumes", icon: "resume" },
  { id: "marketplace", label: "Marketplace", href: "/app/marketplace", icon: "market" },
  { id: "settings", label: "Settings", href: "/app/account", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <g>
        <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <rect x="10" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <rect x="10" y="8" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <rect x="2" y="10" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      </g>
    ),
    board: (
      <g>
        <rect x="2" y="2" width="3.5" height="12" rx="0.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <rect x="6.25" y="2" width="3.5" height="8" rx="0.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <rect x="10.5" y="2" width="3.5" height="10" rx="0.8" stroke="currentColor" strokeWidth="1.3" fill="none" />
      </g>
    ),
    analytics: (
      <g>
        <path d="M2 14V2M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M5 11l2.5-3 2 2L13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="13" cy="5" r="1.3" fill="currentColor" />
      </g>
    ),
    resume: (
      <g>
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </g>
    ),
    market: (
      <g>
        <path d="M2 5l1-2h10l1 2M2 5v8.5a0.5.5 0 00.5.5h11a0.5.5 0 00.5-.5V5M2 5h12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <path d="M5 5v2a3 3 0 006 0V5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      </g>
    ),
    settings: (
      <g>
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path d="M8 1v2m0 10v2M1 8h2m10 0h2M3.5 3.5l1.4 1.4m6.2 6.2l1.4 1.4M3.5 12.5l1.4-1.4m6.2-6.2l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </g>
    ),
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {icons[name]}
    </svg>
  );
}

interface SidebarNavProps {
  userEmail?: string | null;
  userName?: string | null;
}

export function SidebarNav({ userEmail, userName }: SidebarNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  const displayName = userName || userEmail?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="side-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
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

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="side-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`side ${mobileOpen ? "is-open" : ""}`}>
        <Link className="side-logo" href="/app" onClick={() => setMobileOpen(false)}>
          <span className="side-logo-mark" />
          <span className="side-logo-text">
            Maakavoda <em>data</em>
          </span>
        </Link>

        <div className="side-label">Workspace</div>

        <nav className="side-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              className={`side-item ${isActive(item.href) ? "is-active" : ""}`}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <NavIcon name={item.icon} />
              <span className="side-item-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="side-spacer" />

        <div className="side-user">
          <div className="side-user-avatar">{initial}</div>
          <div className="side-user-info">
            <div className="side-user-name">{displayName}</div>
            <div className="side-user-plan">
              {userEmail && (
                <span title={userEmail}>
                  {userEmail.length > 22 ? userEmail.slice(0, 20) + "..." : userEmail}
                </span>
              )}
            </div>
          </div>
          <svg className="side-user-caret" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 4l2 2 2-2M3 6l2-2 2 2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
        </div>
      </aside>
    </>
  );
}
