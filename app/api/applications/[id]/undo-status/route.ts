import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const IdSchema = z.string().min(1);
type Ctx = { params: Promise<{ id: string }> };

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    const owns = await prisma.application.findFirst({
      where: { id: appId, userId },
      select: { id: true },
    });
    if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const last = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, userId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      if (!last) return { ok: false as const, error: "No status changes to undo" };

      await tx.applicationStatusEvent.updateMany({
        where: { id: last.id, userId },
        data: { voidedAt: new Date() },
      });

      const prev = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, userId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      const newStatus = prev ? prev.toStatus : last.fromStatus;

      await tx.application.updateMany({
        where: { id: appId, userId },
        data: { status: newStatus },
      });

      return { ok: true as const, newStatus };
    });

    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
