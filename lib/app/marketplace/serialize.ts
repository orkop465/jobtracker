import type { PublicResume, PublicResumeRating } from "@prisma/client";

export interface PublicResumeDto {
  id: string;
  title: string;
  roleCategory: PublicResume["roleCategory"];
  seniority: PublicResume["seniority"];
  notes: string | null;
  pageCount: number;
  sizeBytes: number;
  publishedAt: string | null;
  ratingCount: number;
  ratingSum: number;
  ratingAverage: number | null;
  featured: boolean;
}

export interface PublicResumeDetailDto extends PublicResumeDto {
  signedUrl: string;
  thumbSignedUrl: string | null;
  myRating: number | null;
  distribution: { stars: number; pct: number }[];
}

export interface MySubmissionDto extends PublicResumeDto {
  status: PublicResume["status"];
  rejectionReason: string | null;
  createdAt: string;
}

export interface AdminPublicResumeDto extends PublicResumeDetailDto {
  status: PublicResume["status"];
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  uploaderEmail: string | null;
}

export function toPublicDto(r: PublicResume): PublicResumeDto {
  const avg = r.ratingCount > 0 ? r.ratingSum / r.ratingCount : null;
  return {
    id: r.id,
    title: r.title,
    roleCategory: r.roleCategory,
    seniority: r.seniority,
    notes: r.notes,
    pageCount: r.pageCount,
    sizeBytes: r.sizeBytes,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    ratingCount: r.ratingCount,
    ratingSum: r.ratingSum,
    ratingAverage: avg,
    featured: r.featured,
  };
}

export function toMySubmissionDto(r: PublicResume): MySubmissionDto {
  return {
    ...toPublicDto(r),
    status: r.status,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
  };
}

export function distributionFromRatings(ratings: Pick<PublicResumeRating, "stars">[]): {
  stars: number;
  pct: number;
}[] {
  const counts = [0, 0, 0, 0, 0];
  for (const r of ratings) {
    if (r.stars >= 1 && r.stars <= 5) counts[r.stars - 1] += 1;
  }
  const total = ratings.length;
  return [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    pct: total === 0 ? 0 : Math.round((counts[s - 1] / total) * 100),
  }));
}
