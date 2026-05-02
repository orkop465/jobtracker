"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  resumeId: string;
}

const LOAD_TIMEOUT_MS = 10_000;

/**
 * Renders the active resume in an iframe pointed at our same-origin proxy.
 * The proxy enforces auth + ownership server-side and streams the GCS object
 * with `Content-Disposition: inline`, so the browser embeds the PDF without
 * the cross-origin block the prior signed-URL flow tripped.
 */
export function PdfPreview({ resumeId }: Props) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <PdfPreviewAttempt
      key={`${resumeId}-${retryKey}`}
      resumeId={resumeId}
      onRetry={() => setRetryKey((k) => k + 1)}
    />
  );
}

interface AttemptProps {
  resumeId: string;
  onRetry: () => void;
}

/**
 * One load attempt. Remounted (via key) by the parent on retry so the iframe
 * tries again from scratch and timeout/loaded state initialize fresh — avoids
 * in-effect setState resets that violate react-hooks/set-state-in-effect.
 */
function PdfPreviewAttempt({ resumeId, onRetry }: AttemptProps) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!loadedRef.current) setTimedOut(true);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="res-pdf-frame-wrap">
      {!loaded && !timedOut && <div className="res-pdf-loading">Loading preview…</div>}
      {timedOut && !loaded && (
        <div className="res-pdf-loading">
          Could not load preview.{" "}
          <button
            type="button"
            onClick={onRetry}
            style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            Retry
          </button>
        </div>
      )}
      <iframe
        className="res-pdf-frame"
        src={`/api/resumes/${resumeId}/view/file`}
        title="Resume preview"
        onLoad={() => {
          loadedRef.current = true;
          setLoaded(true);
        }}
        style={{ visibility: loaded ? "visible" : "hidden" }}
      />
    </div>
  );
}
