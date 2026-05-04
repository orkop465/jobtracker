"use client";

interface Props {
  thumbUrl: string | null;
  alt: string;
}

// Real thumbnail when one exists; falls back to a generic redacted-resume
// silhouette so the grid never shows a hole.
export function MiniRedactedPdf({ thumbUrl, alt }: Props) {
  if (thumbUrl) {
    return (
      <div className="market-card-thumb-inner" style={{ padding: 0, background: "white" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbUrl}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
      </div>
    );
  }
  return (
    <div className="market-card-thumb-inner">
      <div className="market-card-redact" />
      <div className="market-card-redact short" />
      <div className="market-card-redact med" />
      <div className="thumb-section">
        <div className="thumb-section-h">Experience</div>
        <div className="thumb-job">
          <span style={{ background: "#1a1a1a", color: "#1a1a1a", borderRadius: 1 }}>████████</span>
          <span>—</span>
        </div>
        <div className="thumb-bullet">Anonymized resume preview generating…</div>
        <div className="thumb-bullet">PDF rasterization in progress.</div>
      </div>
    </div>
  );
}
