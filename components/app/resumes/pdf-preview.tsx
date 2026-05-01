"use client";

import { useState } from "react";

interface Props {
  resumeId: string;
}

/**
 * Renders the active resume in an iframe pointed at our same-origin proxy.
 * The proxy enforces auth + ownership server-side and streams the GCS object
 * with `Content-Disposition: inline`, so the browser embeds the PDF without
 * the cross-origin block the prior signed-URL flow tripped.
 */
export function PdfPreview({ resumeId }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="res-pdf-frame-wrap">
      {!loaded && <div className="res-pdf-loading">Loading preview…</div>}
      <iframe
        key={resumeId}
        className="res-pdf-frame"
        src={`/api/resumes/${resumeId}/view/file`}
        title="Resume preview"
        onLoad={() => setLoaded(true)}
        style={{ visibility: loaded ? "visible" : "hidden" }}
      />
    </div>
  );
}
