import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/app/marketplace/admin";
import { logAdminAction } from "@/lib/app/marketplace/log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const a = await requireAdmin();
  if (!a.ok) return a.response;
  const { id } = await ctx.params;

  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { status: true, publishedAt: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const updated = await prisma.publicResume.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      reviewedAt: now,
      publishedAt: row.publishedAt ?? now,
      rejectionReason: null,
    },
  });

  logAdminAction({
    action: "approve",
    adminEmail: a.ctx.email,
    publicResumeId: id,
    previousStatus: row.status,
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
