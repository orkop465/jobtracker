"use client";

import { useEffect, useState } from "react";

interface Props {
  resumeId: string;
}

/**
 * Renders the active resume as an iframe of a freshly minted signed URL.
 * The parent should use `key={resumeId}` so the component remounts on
 * resume switch — that gives us a clean initial render without needing
 * to synchronously reset state inside the effect body.
 */
export function PdfPreview({ resumeId }: Props) {
  const [state, setState] = useState<{ url: string | null; error: string | null }>({
    url: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/resumes/${resumeId}/view`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.url) {
          setState({ url: null, error: data?.error ?? "Failed to load PDF" });
          return;
        }
        setState({ url: data.url, error: null });
      } catch (e) {
        if (!cancelled) {
          setState({ url: null, error: e instanceof Error ? e.message : "Failed to load PDF" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  return (
    <div className="res-pdf-frame-wrap">
      {state.url ? (
        <iframe className="res-pdf-frame" src={state.url} title="Resume preview" />
      ) : (
        <div className="res-pdf-loading">{state.error ?? "Loading preview…"}</div>
      )}
    </div>
  );
}
