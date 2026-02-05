import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IdSchema = z.string().min(1);

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    const result = await prisma.$transaction(async (tx) => {
      const last = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      if (!last) return { ok: false as const, error: "No status changes to undo" };

      await tx.applicationStatusEvent.update({
        where: { id: last.id },
        data: { voidedAt: new Date() },
      });

      const prev = await tx.applicationStatusEvent.findFirst({
        where: { applicationId: appId, voidedAt: null },
        orderBy: { createdAt: "desc" },
      });

      const newStatus = prev ? prev.toStatus : last.fromStatus;

      await tx.application.update({
        where: { id: appId },
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
