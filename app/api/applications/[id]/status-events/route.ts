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

export async function GET(_req: NextRequest, ctx: Ctx) {
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

    const items = await prisma.applicationStatusEvent.findMany({
      where: { applicationId: appId, userId, voidedAt: null },
      orderBy: { occurredAt: "asc" },
      take: 50,
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
