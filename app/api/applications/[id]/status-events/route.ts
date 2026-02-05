import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IdSchema = z.string().min(1);

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    const items = await prisma.applicationStatusEvent.findMany({
      where: { applicationId: appId, voidedAt: null },
      orderBy: { occurredAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
