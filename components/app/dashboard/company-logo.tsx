"use client";

const COMPANY_COLORS: Record<string, string> = {
  A: "oklch(0.58 0.14 38)",
  B: "oklch(0.50 0.13 320)",
  C: "oklch(0.55 0.15 300)",
  D: "oklch(0.48 0.13 150)",
  E: "oklch(0.58 0.16 260)",
  F: "oklch(0.55 0.15 300)",
  G: "oklch(0.52 0.12 25)",
  H: "oklch(0.50 0.08 260)",
  I: "oklch(0.60 0.15 30)",
  J: "oklch(0.55 0.10 150)",
  K: "oklch(0.58 0.14 38)",
  L: "oklch(0.50 0.13 320)",
  M: "oklch(0.48 0.13 150)",
  N: "oklch(0.55 0.02 280)",
  O: "oklch(0.60 0.15 30)",
  P: "oklch(0.50 0.08 260)",
  Q: "oklch(0.52 0.12 25)",
  R: "oklch(0.48 0.13 150)",
  S: "oklch(0.58 0.16 260)",
  T: "oklch(0.55 0.15 300)",
  U: "oklch(0.60 0.15 30)",
  V: "oklch(0.30 0.02 280)",
  W: "oklch(0.52 0.12 25)",
  X: "oklch(0.50 0.13 320)",
  Y: "oklch(0.55 0.10 150)",
  Z: "oklch(0.58 0.14 38)",
};

export function CompanyLogo({ company, size = 12 }: { company: string; size?: number }) {
  const initial = company.charAt(0).toUpperCase();
  const bg = COMPANY_COLORS[initial] || "oklch(0.50 0.08 260)";

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 1,
        display: "inline-grid",
        placeItems: "center",
        background: bg,
        color: "white",
        fontSize: Math.round(size * 0.62),
        fontWeight: 700,
        fontFamily: "var(--font-inter-tight, var(--sans))",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}
