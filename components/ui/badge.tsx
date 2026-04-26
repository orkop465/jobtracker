"use client";

type BadgeVariant =
  | "default"
  | "applied"
  | "screen"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "ghosted"
  | "low"
  | "medium"
  | "high";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-3 text-text-secondary border-border",
  applied: "bg-info-muted text-info border-info/20",
  screen: "bg-accent-muted text-accent-text border-accent/20",
  interview: "bg-[rgba(167,139,250,0.10)] text-[#c4b5fd] border-[rgba(167,139,250,0.20)]",
  offer: "bg-positive-muted text-positive border-positive/20",
  rejected: "bg-negative-muted text-negative border-negative/20",
  withdrawn: "bg-surface-3 text-text-muted border-border",
  ghosted: "bg-surface-3 text-text-muted border-border",
  low: "bg-surface-3 text-text-secondary border-border",
  medium: "bg-accent-muted text-accent-text border-accent/20",
  high: "bg-negative-muted text-negative border-negative/20",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-text-muted",
  applied: "bg-info",
  screen: "bg-accent",
  interview: "bg-[#8b5cf6]",
  offer: "bg-positive",
  rejected: "bg-negative",
  withdrawn: "bg-text-muted",
  ghosted: "bg-text-muted",
  low: "bg-text-muted",
  medium: "bg-accent",
  high: "bg-negative",
};

export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "APPLIED":
      return "applied";
    case "RECRUITER_SCREEN":
    case "OA":
      return "screen";
    case "INTERVIEW_ROUND_1":
    case "INTERVIEW_ROUND_2":
    case "INTERVIEW_ROUND_3":
      return "interview";
    case "OFFER":
      return "offer";
    case "REJECTED":
      return "rejected";
    case "WITHDRAWN":
      return "withdrawn";
    case "GHOSTED":
      return "ghosted";
    default:
      return "default";
  }
}

export function priorityToBadgeVariant(priority: string): BadgeVariant {
  switch (priority) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    default:
      return "default";
  }
}

export function Badge({ variant = "default", dot, className = "", children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-0.5 text-[11px] font-medium
        border rounded font-data tracking-wide
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export type { BadgeProps, BadgeVariant };
