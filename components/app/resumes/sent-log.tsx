"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { statusLabel } from "@/lib/constants";
import { formatShortDate, type SentApplication } from "./types";

interface Props {
  resumeId: string;
}

function statusKind(status: string): string {
  if (status === "APPLIED") return "applied";
  if (status === "RECRUITER_SCREEN" || status === "OA") return "phone_screen";
  if (status.startsWith("INTERVIEW_")) return "onsite";
  if (status === "OFFER") return "offer";
  if (status === "REJECTED") return "rejected";
  if (status === "WITHDRAWN") return "withdrawn";
  if (status === "GHOSTED") return "ghosted";
  return "applied";
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; items: SentApplication[] }
  | { kind: "error"; message: string };

/**
 * Parent should use `key={resumeId}` so this component remounts when the
 * active resume changes — we never call setState synchronously inside an
 * effect, just on the async response.
 */
export function SentLog({ resumeId }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/resumes/${resumeId}/applications`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: data?.error ?? "Failed to load sent log" });
          return;
        }
        setState({ kind: "ready", items: data?.items ?? [] });
      } catch (e) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "Failed to load sent log",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  if (state.kind === "loading") {
    return (
      <div className="res-sent">
        <div className="res-sent-head">
          <div className="res-sent-title">Sent log</div>
        </div>
        <div className="res-sent-empty">Loading…</div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="res-sent">
        <div className="res-sent-head">
          <div className="res-sent-title">Sent log</div>
        </div>
        <div className="res-sent-empty">{state.message}</div>
      </div>
    );
  }

  const { items } = state;

  return (
    <div className="res-sent">
      <div className="res-sent-head">
        <div className="res-sent-title">
          Sent log · {items.length} application{items.length === 1 ? "" : "s"}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="res-sent-empty">
          Not attached to any application yet. Pick this resume in the board card detail.
        </div>
      ) : (
        <div className="res-sent-list">
          {items.map((row) => (
            <Link
              key={row.id}
              href={`/app/applications?open=${row.id}`}
              className="res-sent-row"
            >
              <div className="res-sent-co">{row.company}</div>
              <div className="res-sent-role">{row.roleTitle}</div>
              <div className="res-sent-date">{formatShortDate(row.appliedAt)}</div>
              <div className={`res-sent-status ${statusKind(row.status)}`}>
                {statusLabel(row.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
