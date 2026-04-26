"use client";

import { usePathname } from "next/navigation";

const CRUMB_MAP: Record<string, string> = {
  "/app": "Dashboard",
  "/app/applications": "Board",
  "/app/analytics": "Analytics",
  "/app/resumes": "Resumes",
  "/app/marketplace": "Marketplace",
  "/app/account": "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const crumb = CRUMB_MAP[pathname] || pathname.split("/").pop() || "Dashboard";

  return (
    <div className="topbar">
      <div className="topbar-crumbs mono">
        <span>maakavoda</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-cur">{crumb}</span>
      </div>

      <div className="topbar-actions">
        <button className="topbar-btn has-dot" title="Notifications">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path
              d="M7.5 2a4 4 0 00-4 4v3l-1 1.5h10L11.5 9V6a4 4 0 00-4-4zM6 12.5a1.5 1.5 0 003 0"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="topbar-btn" title="Help">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="5.8" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M5.8 5.8a1.7 1.7 0 013.4 0c0 1-1.7 1.3-1.7 2.5M7.5 10.5v0.2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          className="topbar-quickadd"
          onClick={() => {
            // Dispatch keyboard event to trigger quick-add
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "n", bubbles: true })
            );
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Add role
          <kbd>N</kbd>
        </button>
      </div>
    </div>
  );
}
