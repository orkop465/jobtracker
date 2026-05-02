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
  const featured = body?.featured === true;

  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.publicResume.update({
    where: { id },
    data: { featured },
  });

  logAdminAction({
    action: featured ? "feature" : "unfeature",
    adminEmail: a.ctx.email,
    publicResumeId: id,
    previousStatus: row.status,
  });

  return NextResponse.json({ ok: true, featured });
}
