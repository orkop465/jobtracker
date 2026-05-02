import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/app/marketplace/admin";
import { logAdminAction } from "@/lib/app/marketplace/log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await requireAdmin();
  if (!a.ok) return a.response;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Only published submissions can be unpublished" }, { status: 409 });
  }

  await prisma.publicResume.update({
    where: { id },
    data: {
      status: "UNPUBLISHED",
      rejectionReason: reason,
      reviewedAt: new Date(),
    },
  });

  logAdminAction({
    action: "unpublish",
    adminEmail: a.ctx.email,
    publicResumeId: id,
    reason,
    previousStatus: row.status,
  });

  return NextResponse.json({ ok: true });
}
