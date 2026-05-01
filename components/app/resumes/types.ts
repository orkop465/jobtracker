export type Resume = {
  id: string;
  label: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  gcsPath: string;
  sentCount: number;
  lastAppliedAt: string | null;
};

export type SentApplication = {
  id: string;
  company: string;
  roleTitle: string;
  status: string;
  appliedAt: string;
};

export type DerivedTag = "swe" | "pm" | "design" | "data" | "ml" | "other";

const TAG_PATTERNS: { tag: DerivedTag; rx: RegExp }[] = [
  { tag: "ml", rx: /\b(ml|machine\s?learning|ai|llm|nlp|recsys)\b/i },
  { tag: "data", rx: /\b(data|analyst|analytics|scientist)\b/i },
  { tag: "design", rx: /\b(design|ux|ui)\b/i },
  { tag: "pm", rx: /\b(pm|product\s?manager|product)\b/i },
  { tag: "swe", rx: /\b(swe|sde|engineer|frontend|backend|fullstack|full-stack|developer|software)\b/i },
];

export function deriveTag(label: string): DerivedTag {
  for (const { tag, rx } of TAG_PATTERNS) {
    if (rx.test(label)) return tag;
  }
  return "other";
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr}y ago`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
