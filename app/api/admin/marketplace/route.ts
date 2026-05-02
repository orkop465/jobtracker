import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/app/marketplace/admin";
import type { PublicResumeStatus } from "@prisma/client";

const STATUS_VALUES: PublicResumeStatus[] = [
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "UNPUBLISHED",
];

export async function GET(req: NextRequest) {
  const a = await requireAdmin();
  if (!a.ok) return a.response;

  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status") ?? "PENDING_REVIEW";
  const status = (STATUS_VALUES as string[]).includes(statusRaw)
    ? (statusRaw as PublicResumeStatus)
    : "PENDING_REVIEW";

  const orderBy =
    status === "PENDING_REVIEW"
      ? { createdAt: "asc" as const }
      : status === "PUBLISHED"
        ? { publishedAt: "desc" as const }
        : { updatedAt: "desc" as const };

  const items = await prisma.publicResume.findMany({
    where: { status },
    orderBy,
    take: 100,
    include: { uploader: { select: { email: true, name: true } } },
  });

  // Count by status for the metric strip.
  const counts = await prisma.publicResume.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countsByStatus: Record<PublicResumeStatus, number> = {
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    UNPUBLISHED: 0,
  };
  for (const c of counts) countsByStatus[c.status] = c._count._all;

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      roleCategory: r.roleCategory,
      seniority: r.seniority,
      status: r.status,
      pageCount: r.pageCount,
      sizeBytes: r.sizeBytes,
      createdAt: r.createdAt.toISOString(),
      publishedAt: r.publishedAt?.toISOString() ?? null,
      ratingCount: r.ratingCount,
      ratingSum: r.ratingSum,
      featured: r.featured,
      uploaderEmail: r.uploader?.email ?? null,
      rejectionReason: r.rejectionReason,
    })),
    counts: countsByStatus,
  });
}
