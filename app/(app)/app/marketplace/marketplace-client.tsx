"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketCard } from "@/components/app/marketplace/market-card";
import { MarketRow } from "@/components/app/marketplace/market-row";
import { PeekModal } from "@/components/app/marketplace/peek-modal";
import { ShareModal } from "@/components/app/marketplace/share-modal";
import {
  ROLE_FILTERS,
  SENIORITY_FILTERS,
  SORT_OPTIONS,
  type MarketplaceStats,
  type MySubmission,
  type PublicResumeDetail,
  type PublicResumeListItem,
  type RoleId,
  type SeniorityId,
  type SortId,
} from "@/components/app/marketplace/types";

type Tab = "browse" | "saved" | "mine";

interface SavedItem extends PublicResumeListItem {
  savedAt: string;
}
type View = "grid" | "list";

interface PrivateResumeOption {
  id: string;
  label: string;
  filename: string;
}

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function MarketplaceClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const initialTab = sp.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab === "mine" || initialTab === "saved" ? initialTab : "browse",
  );

  // Browse state
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const debouncedSearch = useDebounced(search, 250);
  const [activeRoles, setActiveRoles] = useState<Set<RoleId>>(
    new Set((sp.get("role") ?? "").split(",").filter(Boolean) as RoleId[]),
  );
  const [activeSeniority, setActiveSeniority] = useState<Set<SeniorityId>>(
    new Set((sp.get("seniority") ?? "").split(",").filter(Boolean) as SeniorityId[]),
  );
  const [sort, setSort] = useState<SortId>((sp.get("sort") as SortId) ?? "new");
  const [view, setView] = useState<View>("grid");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [items, setItems] = useState<PublicResumeListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState<PublicResumeDetail | null>(null);
  const [openIsOwn, setOpenIsOwn] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [mine, setMine] = useState<MySubmission[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const [privateResumes, setPrivateResumes] = useState<PrivateResumeOption[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Sync URL with browse state
  const lastUrlRef = useRef("");
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "browse") params.set("tab", tab);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeRoles.size) params.set("role", [...activeRoles].join(","));
    if (activeSeniority.size) params.set("seniority", [...activeSeniority].join(","));
    if (sort !== "new") params.set("sort", sort);
    const qs = params.toString();
    const next = qs ? `/app/marketplace?${qs}` : "/app/marketplace";
    if (next !== lastUrlRef.current) {
      lastUrlRef.current = next;
      router.replace(next, { scroll: false });
    }
  }, [tab, debouncedSearch, activeRoles, activeSeniority, sort, router]);

  // Load list
  useEffect(() => {
    if (tab !== "browse") return;
    let cancel = false;
    async function go() {
      setLoadingList(true);
      setListError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (activeRoles.size) params.set("role", [...activeRoles].join(","));
        if (activeSeniority.size) params.set("seniority", [...activeSeniority].join(","));
        params.set("sort", sort);
        const res = await fetch(`/api/marketplace?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancel) return;
        if (!res.ok) {
          setListError(data?.error ?? `Failed (${res.status})`);
          setItems([]);
          return;
        }
        setItems(data.items ?? []);
      } catch (e) {
        if (cancel) return;
        setListError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancel) setLoadingList(false);
      }
    }
    go();
    return () => {
      cancel = true;
    };
  }, [tab, debouncedSearch, activeRoles, activeSeniority, sort]);

  // Load stats once
  useEffect(() => {
    fetch("/api/marketplace/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  // Load my submissions when tab opened
  useEffect(() => {
    if (tab !== "mine") return;
    setLoadingMine(true);
    fetch("/api/marketplace/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMine(d.items ?? []))
      .catch(() => setMine([]))
      .finally(() => setLoadingMine(false));
  }, [tab]);

  // Load saved (always — used by both the bookmark fill state on Browse and
  // the Saved tab list).
  useEffect(() => {
    setLoadingSaved(true);
    fetch("/api/marketplace/saved", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setSaved(d.items ?? []);
        setSavedIds(new Set<string>((d.savedIds ?? []) as string[]));
      })
      .catch(() => {
        setSaved([]);
        setSavedIds(new Set());
      })
      .finally(() => setLoadingSaved(false));
  }, []);

  // Load private resume list (for share modal)
  useEffect(() => {
    fetch("/api/resumes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setPrivateResumes(
          (d.items ?? []).map((r: { id: string; label: string; filename: string }) => ({
            id: r.id,
            label: r.label,
            filename: r.filename,
          })),
        ),
      )
      .catch(() => setPrivateResumes([]));
  }, []);

  // Load detail when peek opens
  useEffect(() => {
    if (!openId) {
      setOpenDetail(null);
      return;
    }
    let cancel = false;
    fetch(`/api/marketplace/${openId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (d?.id) {
          setOpenDetail(d);
          // We're "own" if /me/submissions includes this id
          setOpenIsOwn(mine.some((m) => m.id === openId));
        } else {
          showToast("Could not load resume");
          setOpenId(null);
        }
      })
      .catch(() => {
        if (cancel) return;
        showToast("Could not load resume");
        setOpenId(null);
      });
    return () => {
      cancel = true;
    };
  }, [openId, mine, showToast]);

  function toggleRole(id: RoleId) {
    setActiveRoles((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleSeniority(id: SeniorityId) {
    setActiveSeniority((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  async function toggleSaved(id: string) {
    const wasSaved = savedIds.has(id);
    // Optimistic UI; revert on failure.
    setSavedIds((s) => {
      const n = new Set(s);
      if (wasSaved) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      const res = await fetch(`/api/marketplace/${id}/save`, {
        method: wasSaved ? "DELETE" : "PUT",
      });
      if (!res.ok) {
        setSavedIds((s) => {
          const n = new Set(s);
          if (wasSaved) n.add(id);
          else n.delete(id);
          return n;
        });
        const data = await res.json().catch(() => ({}));
        showToast(data?.error ?? "Save failed");
        return;
      }
      showToast(wasSaved ? "Removed from saved" : "Saved to your library");
      // If we're on the Saved tab, drop the unsaved row from view immediately.
      if (wasSaved) setSaved((cur) => cur.filter((s) => s.id !== id));
    } catch (e) {
      setSavedIds((s) => {
        const n = new Set(s);
        if (wasSaved) n.add(id);
        else n.delete(id);
        return n;
      });
      showToast(e instanceof Error ? e.message : "Save failed");
    }
  }

  const filteredCount = items.length;

  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((s) => s.id === sort)?.label.toLowerCase() ?? "newest",
    [sort],
  );

  return (
    <div className="market-page">
      {/* Hero */}
      <div className="market-hero">
        <div>
          <div className="market-hero-eyebrow">Maakavoda · Marketplace</div>
          <h1 className="market-hero-title">
            Browse <em>resumes that worked.</em>
          </h1>
          <p className="market-hero-sub">
            Anonymized resumes shared by people who got the interview — and sometimes the offer.
            Filter by role and seniority, rate what you find useful, and contribute one of your own.
          </p>
        </div>
        <div className="market-hero-stats">
          <div className="market-hero-stat">
            <div className="market-hero-stat-num">
              {stats ? stats.total.toLocaleString() : "—"}
            </div>
            <div className="market-hero-stat-label">Resumes</div>
          </div>
          <div className="market-hero-stat">
            <div className="market-hero-stat-num">
              {stats ? stats.ratingsThisMonth.toLocaleString() : "—"}
            </div>
            <div className="market-hero-stat-label">Ratings this mo.</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "12px 40px 0",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        {(
          [
            { id: "browse", label: "Browse" },
            { id: "saved", label: `Saved${savedIds.size ? ` (${savedIds.size})` : ""}` },
            { id: "mine", label: "My submissions" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 2px",
              border: "none",
              background: "transparent",
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
              borderBottom:
                tab === t.id ? "2px solid var(--ink)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "browse" && (
        <>
          {/* Toolbar */}
          <div className="market-tools">
            <div className="market-tools-search">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="3.8" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11.5 11.5L8.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search resumes, tags, companies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="market-sort">
              <span>Sort</span>
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`market-sort-pill ${sort === s.id ? "is-active" : ""}`}
                  onClick={() => setSort(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="market-tools-spacer" />
            <div className="market-view-toggle">
              <button
                className={view === "grid" ? "is-active" : ""}
                onClick={() => setView("grid")}
                title="Grid"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1.5" y="1.5" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="7.5" y="1.5" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="1.5" y="7.5" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="7.5" y="7.5" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                className={view === "list" ? "is-active" : ""}
                onClick={() => setView("list")}
                title="List"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M2 3h9M2 6.5h9M2 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button className="market-share-btn" onClick={() => setShareOpen(true)}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Share yours
            </button>
          </div>

          {/* Body */}
          <div className="market-body">
            <aside className="market-rail">
              <div className="market-rail-section">
                <div className="market-rail-label">
                  Role
                  {activeRoles.size > 0 && (
                    <span className="clear" onClick={() => setActiveRoles(new Set())}>
                      clear
                    </span>
                  )}
                </div>
                {ROLE_FILTERS.map((f) => (
                  <div
                    key={f.id}
                    className={`market-filter-row ${activeRoles.has(f.id) ? "is-on" : ""}`}
                    onClick={() => toggleRole(f.id)}
                  >
                    <span className="check">
                      {activeRoles.has(f.id) && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5l2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>

              <div className="market-rail-section">
                <div className="market-rail-label">
                  Seniority
                  {activeSeniority.size > 0 && (
                    <span className="clear" onClick={() => setActiveSeniority(new Set())}>
                      clear
                    </span>
                  )}
                </div>
                {SENIORITY_FILTERS.map((f) => (
                  <div
                    key={f.id}
                    className={`market-filter-row ${activeSeniority.has(f.id) ? "is-on" : ""}`}
                    onClick={() => toggleSeniority(f.id)}
                  >
                    <span className="check">
                      {activeSeniority.has(f.id) && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path
                            d="M2 5l2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>
            </aside>

            <div className="market-feed">
              <div className="market-feed-head">
                <h2 className="market-feed-count">
                  {loadingList ? "Loading…" : `${filteredCount} resumes`}
                  <span>· sorted by {sortLabel}</span>
                </h2>
              </div>

              {listError && (
                <div
                  style={{
                    padding: 14,
                    border: "1px solid oklch(0.55 0.15 30)",
                    borderRadius: 4,
                    background: "oklch(0.96 0.04 30 / 0.5)",
                    color: "oklch(0.45 0.15 30)",
                    fontFamily: "var(--sans)",
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  {listError}
                </div>
              )}

              {!loadingList && items.length === 0 && !listError && (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: 40,
                    textAlign: "center",
                    background: "var(--bg-2)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: 20,
                      color: "var(--ink)",
                      marginBottom: 6,
                    }}
                  >
                    No published resumes yet.
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: 13,
                      color: "var(--ink-2)",
                      marginBottom: 16,
                    }}
                  >
                    Be the first.
                  </div>
                  <button className="market-share-btn" onClick={() => setShareOpen(true)}>
                    Share yours
                  </button>
                </div>
              )}

              {view === "grid" ? (
                <div className="market-grid">
                  {items.map((r) => (
                    <MarketCard
                      key={r.id}
                      resume={r}
                      thumbUrl={r.thumbUrl}
                      isSaved={savedIds.has(r.id)}
                      onSave={() => toggleSaved(r.id)}
                      onOpen={() => setOpenId(r.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="market-list">
                  {items.map((r) => (
                    <MarketRow
                      key={r.id}
                      resume={r}
                      isSaved={savedIds.has(r.id)}
                      onSave={() => toggleSaved(r.id)}
                      onOpen={() => setOpenId(r.id)}
                    />
                  ))}
                </div>
              )}

              {/* Upload-yours CTA */}
              <div className="market-upload-cta">
                <div className="market-upload-cta-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="6" y="3" width="16" height="22" rx="1" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 9h8M10 13h8M10 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="22" cy="22" r="6" fill="var(--bg)" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M22 19v6M19 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="market-upload-cta-body">
                  <h3 className="market-upload-cta-h">Help the next person figure it out.</h3>
                  <p className="market-upload-cta-p">
                    Share your resume anonymously. We&apos;ll redact what you mark and an admin
                    reviews before it goes live.
                  </p>
                </div>
                <button className="market-upload-cta-btn" onClick={() => setShareOpen(true)}>
                  Share yours
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "saved" && (
        <div style={{ padding: "24px 32px 60px", overflowY: "auto" }}>
          <h2 className="market-feed-count" style={{ marginBottom: 18 }}>
            {loadingSaved ? "Loading…" : `${saved.length} saved`}
            <span>· your library</span>
          </h2>
          {!loadingSaved && saved.length === 0 && (
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: 40,
                textAlign: "center",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 20,
                  marginBottom: 6,
                }}
              >
                Nothing saved yet.
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink-2)",
                }}
              >
                Click the bookmark on any resume in Browse to save it here.
              </div>
            </div>
          )}
          {!loadingSaved && saved.length > 0 && (
            <div className="market-grid">
              {saved.map((r) => (
                <MarketCard
                  key={r.id}
                  resume={r}
                  thumbUrl={r.thumbUrl}
                  isSaved={savedIds.has(r.id)}
                  onSave={() => toggleSaved(r.id)}
                  onOpen={() => setOpenId(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div style={{ padding: "24px 40px 60px" }}>
          {loadingMine && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ink-3)",
              }}
            >
              Loading…
            </div>
          )}
          {!loadingMine && mine.length === 0 && (
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: 40,
                textAlign: "center",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 20,
                  marginBottom: 6,
                }}
              >
                You haven&apos;t shared anything yet.
              </div>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  marginBottom: 16,
                }}
              >
                Share an anonymized version to help others figure out the format.
              </div>
              <button className="market-share-btn" onClick={() => setShareOpen(true)}>
                Share yours
              </button>
            </div>
          )}
          {!loadingMine && mine.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mine.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 18,
                    alignItems: "center",
                    padding: "14px 18px",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    background: "var(--bg)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {m.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--ink-3)",
                        marginTop: 2,
                      }}
                    >
                      Submitted {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                    {m.rejectionReason && m.status !== "PENDING_REVIEW" && (
                      <div
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 12,
                          color: "var(--ink-2)",
                          marginTop: 6,
                        }}
                      >
                        Reason: {m.rejectionReason}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      padding: "3px 8px",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      color:
                        m.status === "PUBLISHED"
                          ? "oklch(0.4 0.12 145)"
                          : m.status === "REJECTED" || m.status === "UNPUBLISHED"
                            ? "oklch(0.45 0.13 30)"
                            : "var(--ink-2)",
                      background:
                        m.status === "PUBLISHED"
                          ? "oklch(0.95 0.04 145 / 0.5)"
                          : m.status === "REJECTED" || m.status === "UNPUBLISHED"
                            ? "oklch(0.95 0.04 30 / 0.4)"
                            : "var(--bg-2)",
                    }}
                  >
                    {m.status.replace("_", " ").toLowerCase()}
                  </span>
                  <button
                    onClick={() => setOpenId(m.id)}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      fontFamily: "var(--sans)",
                      fontSize: 12,
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {openDetail && (
        <PeekModal
          detail={openDetail}
          isOwn={openIsOwn}
          onClose={() => {
            setOpenId(null);
            setOpenDetail(null);
          }}
          onRated={(stars) => {
            // Update local list aggregate optimistically
            setItems((cur) =>
              cur.map((r) =>
                r.id === openDetail.id
                  ? {
                      ...r,
                      ratingCount: stars ? r.ratingCount + (openDetail.myRating ? 0 : 1) : r.ratingCount,
                    }
                  : r,
              ),
            );
          }}
          onToast={showToast}
        />
      )}
      {shareOpen && (
        <ShareModal
          privateResumes={privateResumes}
          onClose={() => setShareOpen(false)}
          onToast={showToast}
        />
      )}
      {toast && (
        <div className="market-toast">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M3 6.5l2.5 2.5L10 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
