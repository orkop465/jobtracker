export type RoleId =
  | "SWE"
  | "PM"
  | "DESIGN"
  | "DATA"
  | "ML"
  | "DEVOPS"
  | "SECURITY"
  | "OTHER";

export type SeniorityId =
  | "STUDENT"
  | "INTERN"
  | "ENTRY"
  | "MID"
  | "SENIOR"
  | "STAFF_PLUS";

export type StatusId = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "UNPUBLISHED";

export interface PublicResumeListItem {
  id: string;
  title: string;
  roleCategory: RoleId;
  seniority: SeniorityId;
  notes: string | null;
  pageCount: number;
  sizeBytes: number;
  publishedAt: string | null;
  ratingCount: number;
  ratingSum: number;
  ratingAverage: number | null;
  featured: boolean;
}

export interface PublicResumeDetail extends PublicResumeListItem {
  signedUrl: string;
  thumbSignedUrl: string | null;
  myRating: number | null;
  distribution: { stars: number; pct: number }[];
}

export interface MySubmission extends PublicResumeListItem {
  status: StatusId;
  rejectionReason: string | null;
  createdAt: string;
}

export interface MarketplaceStats {
  total: number;
  placed: number;
  ratingsThisMonth: number;
}

export const ROLE_FILTERS: { id: RoleId; label: string }[] = [
  { id: "SWE", label: "Software Engineering" },
  { id: "PM", label: "Product Management" },
  { id: "DESIGN", label: "Design" },
  { id: "DATA", label: "Data / Analytics" },
  { id: "ML", label: "ML / AI" },
  { id: "DEVOPS", label: "DevOps / Infra" },
  { id: "SECURITY", label: "Security" },
  { id: "OTHER", label: "Other" },
];

export const SENIORITY_FILTERS: { id: SeniorityId; label: string }[] = [
  { id: "STUDENT", label: "Student" },
  { id: "INTERN", label: "Intern / New grad" },
  { id: "ENTRY", label: "Junior (1-3 yrs)" },
  { id: "MID", label: "Mid (3-6 yrs)" },
  { id: "SENIOR", label: "Senior (6-10 yrs)" },
  { id: "STAFF_PLUS", label: "Staff+ (10+ yrs)" },
];

export const SORT_OPTIONS = [
  { id: "top", label: "Top rated" },
  { id: "new", label: "Newest" },
  { id: "placed", label: "Most rated" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

export function shortRoleLabel(r: RoleId): string {
  const m: Record<RoleId, string> = {
    SWE: "SWE",
    PM: "PM",
    DESIGN: "Design",
    DATA: "Data",
    ML: "ML",
    DEVOPS: "DevOps",
    SECURITY: "Security",
    OTHER: "Other",
  };
  return m[r];
}

export function shortSeniorityLabel(s: SeniorityId): string {
  const m: Record<SeniorityId, string> = {
    STUDENT: "Student",
    INTERN: "New grad",
    ENTRY: "Junior",
    MID: "Mid",
    SENIOR: "Senior",
    STAFF_PLUS: "Staff+",
  };
  return m[s];
}
