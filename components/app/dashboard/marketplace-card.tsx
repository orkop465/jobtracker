"use client";

const PLACEHOLDER_RESUMES = [
  { handle: "anon-pine-55", role: "Staff Engineer", rating: "4.9", excerpt: "Technical lead on platform serving 40M daily users." },
  { handle: "anon-fern-09", role: "Product Manager", rating: "4.8", excerpt: "Shipped paywall redesign driving +14% conversion." },
  { handle: "anon-lynx-03", role: "ML Engineer", rating: "4.8", excerpt: "Fine-tuned production LLM saving $1.2M/yr." },
];

export function MarketplaceCard() {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[07]</span>
          <span className="card-title">Top-rated in marketplace</span>
          <span className="card-sub">&middot; this week</span>
        </div>
        <button className="card-action">Browse all &rarr;</button>
      </div>
      <div className="resume-callouts">
        {PLACEHOLDER_RESUMES.map((r, i) => (
          <div key={i} className="resume-callout">
            <div className="resume-callout-top">
              <span className="resume-callout-handle">{r.handle}</span>
              <span className="resume-callout-rating">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 1l1.3 2.6L9 4l-2 2 0.5 2.9L5 7.5 2.5 8.9 3 6 1 4l2.7-0.4L5 1z" stroke="currentColor" strokeWidth="0.5" />
                </svg>
                {r.rating}
              </span>
            </div>
            <div className="resume-callout-role">{r.role}</div>
            <div className="resume-callout-excerpt">&ldquo;{r.excerpt}&rdquo;</div>
            <div className="resume-callout-foot">
              <span>REDACTED &middot; anonymous</span>
              <span>view &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
