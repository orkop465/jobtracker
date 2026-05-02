import type {
  MarketplaceRoleCategory,
  MarketplaceSeniority,
  PublicResumeStatus,
} from "@prisma/client";

export const ROLE_LABELS: Record<MarketplaceRoleCategory, string> = {
  SWE: "Software Engineering",
  PM: "Product Management",
  DESIGN: "Design",
  DATA: "Data / Analytics",
  ML: "ML / AI",
  DEVOPS: "DevOps / Infra",
  SECURITY: "Security",
  OTHER: "Other",
};

export const SENIORITY_LABELS: Record<MarketplaceSeniority, string> = {
  STUDENT: "Student",
  INTERN: "Intern / New grad",
  ENTRY: "Junior (1-3 yrs)",
  MID: "Mid (3-6 yrs)",
  SENIOR: "Senior (6-10 yrs)",
  STAFF_PLUS: "Staff+ (10+ yrs)",
};

export const STATUS_LABELS: Record<PublicResumeStatus, string> = {
  PENDING_REVIEW: "Pending",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  UNPUBLISHED: "Unpublished",
};

export const SORT_OPTIONS = [
  { id: "top", label: "Top rated" },
  { id: "new", label: "Newest" },
  { id: "placed", label: "Most placed" },
] as const;

export type SortId = (typeof SORT_OPTIONS)[number]["id"];

export const LIMITS = {
  pendingPerUser: 5,
  publishedPerUser: 10,
  ratingsPerHour: 60,
  submissionsPerHour: 10,
  maxPages: 4,
  maxSourceMb: 2,
  maxOutputMb: 8,
  rasterizeDpi: 150,
  pageSize: 30,
} as const;

export const RESUMES_BUCKET_ENV = "RESUMES_BUCKET";

export function gsPath(bucket: string, object: string): string {
  return `gs://${bucket}/${object}`;
}

export function publicResumeKey(publicResumeId: string): string {
  return `marketplace/${publicResumeId}.pdf`;
}

export function publicResumeThumbKey(publicResumeId: string): string {
  return `marketplace/${publicResumeId}-thumb.jpg`;
}

export function stagingPrefix(userId: string): string {
  return `marketplace-staging/${userId}/`;
}

export function stagingKey(userId: string, sessionId: string): string {
  return `${stagingPrefix(userId)}${sessionId}.pdf`;
}
