export type SourceBucket = "all" | "referral" | "board" | "recruit" | "direct";

const STATUS_MARKER: Record<string, string> = {
  APPLIED: "oklch(0.58 0.09 235)",
  RECRUITER_SCREEN: "oklch(0.74 0.12 80)",
  OA: "oklch(0.66 0.10 100)",
  INTERVIEW_ROUND_1: "oklch(0.62 0.08 310)",
  INTERVIEW_ROUND_2: "oklch(0.62 0.08 310)",
  INTERVIEW_ROUND_3: "oklch(0.62 0.08 310)",
  OFFER: "oklch(0.60 0.13 150)",
  REJECTED: "oklch(0.55 0.13 30)",
  WITHDRAWN: "oklch(0.65 0.02 120)",
  GHOSTED: "oklch(0.62 0.05 60)",
};

export const COLOR_PALETTE: { id: string; value: string; label: string }[] = [
  { id: "neutral", value: "oklch(0.55 0.02 280)", label: "Neutral" },
  { id: "sky", value: "oklch(0.58 0.09 235)", label: "Sky" },
  { id: "amber", value: "oklch(0.74 0.12 80)", label: "Amber" },
  { id: "lemon", value: "oklch(0.66 0.10 100)", label: "Lemon" },
  { id: "lilac", value: "oklch(0.62 0.08 310)", label: "Lilac" },
  { id: "sage", value: "oklch(0.60 0.13 150)", label: "Sage" },
  { id: "accent", value: "oklch(0.62 0.155 55)", label: "Burnt amber" },
  { id: "clay", value: "oklch(0.55 0.13 30)", label: "Clay" },
  { id: "ash", value: "oklch(0.65 0.02 120)", label: "Ash" },
  { id: "slate", value: "oklch(0.45 0.04 250)", label: "Slate" },
];

const STATUS_DESC: Record<string, string> = {
  APPLIED: "awaiting reply",
  RECRUITER_SCREEN: "recruiter screen",
  OA: "online assessment",
  INTERVIEW_ROUND_1: "first round",
  INTERVIEW_ROUND_2: "second round",
  INTERVIEW_ROUND_3: "final loop",
  OFFER: "negotiating",
  REJECTED: "closed — rejected",
  WITHDRAWN: "closed — withdrew",
  GHOSTED: "closed — ghosted",
};

export function markerColorForStatus(status: string | null): string {
  if (status && STATUS_MARKER[status]) return STATUS_MARKER[status];
  return "oklch(0.55 0.02 280)";
}

export function markerColorForColumn(col: {
  color: string | null;
  mappedStatus: string | null;
}): string {
  return col.color ?? markerColorForStatus(col.mappedStatus);
}

export function descForStatus(status: string | null): string {
  if (status && STATUS_DESC[status]) return STATUS_DESC[status];
  return "tracking";
}

export function isTerminalStatus(status: string | null): boolean {
  return status === "REJECTED" || status === "WITHDRAWN" || status === "GHOSTED";
}

export function closedLabel(status: string | null): string | null {
  if (status === "REJECTED") return "rejected";
  if (status === "WITHDRAWN") return "withdrew";
  if (status === "GHOSTED") return "ghosted";
  return null;
}

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export function isStalled(status: string | null, updatedAt: string | null | undefined): boolean {
  if (isTerminalStatus(status)) return false;
  if (status === "OFFER") return false;
  return daysSince(updatedAt) >= 10;
}

export function mapSourceToBucket(
  source: string | null | undefined,
): Exclude<SourceBucket, "all"> | null {
  if (source == null || source === "") return null;
  if (source === "REFERRAL") return "referral";
  if (source === "RECRUITER_OUTREACH") return "recruit";
  if (
    source === "JOB_BOARD" ||
    source === "LINKEDIN" ||
    source === "INDEED" ||
    source === "GLASSDOOR"
  )
    return "board";
  return "direct";
}

export function sourceBucketLabel(b: SourceBucket): string {
  switch (b) {
    case "all":
      return "All";
    case "referral":
      return "Referral";
    case "board":
      return "Job board";
    case "recruit":
      return "Recruiter";
    case "direct":
      return "Direct";
  }
}

const COMPANY_PALETTE: Record<string, string> = {
  Anthropic: "oklch(0.58 0.14 38)",
  Linear: "oklch(0.50 0.13 320)",
  Figma: "oklch(0.55 0.15 300)",
  Ramp: "oklch(0.48 0.13 150)",
  Stripe: "oklch(0.58 0.16 260)",
  Vercel: "oklch(0.30 0.02 280)",
  Notion: "oklch(0.55 0.02 280)",
  Airtable: "oklch(0.60 0.15 30)",
  Retool: "oklch(0.52 0.12 25)",
  Plaid: "oklch(0.50 0.08 260)",
};

export function companyColor(name: string): string {
  if (COMPANY_PALETTE[name]) return COMPANY_PALETTE[name];
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.55 0.10 ${hue})`;
}

export function pinRotation(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 21) - 10) * 0.07;
}

export function formatComp(
  salaryMin: number | null,
  salaryMax: number | null,
  currency: string | null,
): string {
  if (salaryMin == null && salaryMax == null) return "—";
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const fmt = (n: number) => {
    if (n >= 1000) return `${sym}${Math.round(n / 1000)}k`;
    return `${sym}${n}`;
  };
  if (salaryMin != null && salaryMax != null) return `${fmt(salaryMin)}–${fmt(salaryMax)}`;
  if (salaryMin != null) return `${fmt(salaryMin)}+`;
  return `up to ${fmt(salaryMax!)}`;
}

export function formatNext(nextFollowUp: string | null | undefined): string | null {
  if (!nextFollowUp) return null;
  const d = new Date(nextFollowUp);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

// ── Drag-drop position math ────────────────────────────────────────
// targetCards is the target column's cards excluding the dragging
// card, sorted by position ascending.

export function computeDropInsertIdx(
  targetCards: { id: string }[],
  overCardId: string | null,
  side: "above" | "below",
): number {
  if (!overCardId) return targetCards.length;
  const overIdx = targetCards.findIndex((c) => c.id === overCardId);
  if (overIdx === -1) return targetCards.length;
  return side === "below" ? overIdx + 1 : overIdx;
}

export function computeDropPosition(
  targetCards: { position: number }[],
  insertIdx: number,
): number {
  const before = targetCards[insertIdx - 1];
  const after = targetCards[insertIdx];
  if (!before && after) return after.position - 1;
  if (before && !after) return before.position + 1;
  if (before && after) {
    const gap = after.position - before.position;
    return gap > 0 ? before.position + gap / 2 : before.position + 0.5;
  }
  return 1;
}

