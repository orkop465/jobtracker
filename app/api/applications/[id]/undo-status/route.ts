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

    // Race-safe undo: read the latest non-voided event AND the current
    // application status inside the transaction, then condition every write
    // on what we observed. A concurrent status PATCH or another undo will
    // either lose the conditional updateMany (count 0) or commit cleanly
    // before we read — both outcomes are correct.
    const result = await prisma.$transaction(async (tx) => {
      const currentApp = await tx.application.findFirst({
        where: { id: appId, userId },
        select: { status: true },
      });
      if (!currentApp) return { ok: false as const, error: "Not found" };

      const last = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, userId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      if (!last) return { ok: false as const, error: "No status changes to undo" };

      // Conditional void: only succeeds if this exact event is still the
      // latest non-voided one. A concurrent undo would have already voided it.
      const voided = await tx.applicationStatusEvent.updateMany({
        where: { id: last.id, userId, voidedAt: null },
        data: { voidedAt: new Date() },
      });
      if (voided.count !== 1) {
        return { ok: false as const, error: "Conflict — please retry" };
      }

      const prev = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, userId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      const newStatus = prev ? prev.toStatus : last.fromStatus;

      // Find a column matching the restored status so the card visually
      // returns to the right column. If none exists, leave boardColumnId
      // alone (the client falls back to mappedStatus rendering).
      const targetCol = await tx.boardColumn.findFirst({
        where: { userId, mappedStatus: newStatus },
      });

      const updateData: { status: typeof newStatus; boardColumnId?: string } = {
        status: newStatus,
      };
      if (targetCol) updateData.boardColumnId = targetCol.id;

      // Conditional status reset: the application must still be in the
      // status that was set by the event we just voided. If it's not, a
      // concurrent PATCH already changed it and we should not clobber.
      const restored = await tx.application.updateMany({
        where: { id: appId, userId, status: last.toStatus },
        data: updateData,
      });
      if (restored.count !== 1) {
        return { ok: false as const, error: "Conflict — please retry" };
      }

      return { ok: true as const, newStatus };
    });

    if (!result.ok) {
      const status = result.error === "Conflict — please retry" ? 409 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
