import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const column = await prisma.boardColumn.findFirst({ where: { id, userId } });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name is required (max 60 chars)" }, { status: 400 });
  }

  const updated = await prisma.boardColumn.update({ where: { id }, data: { name } });

  return NextResponse.json({
    column: {
      id: updated.id,
      name: updated.name,
      position: updated.position,
      mappedStatus: updated.mappedStatus,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const column = await prisma.boardColumn.findFirst({ where: { id, userId } });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const total = await prisma.boardColumn.count({ where: { userId } });
  if (total <= 1) {
    return NextResponse.json({ error: "Cannot delete the last column" }, { status: 400 });
  }

  const fallback = await prisma.boardColumn.findFirst({
    where: { userId, id: { not: id } },
    orderBy: { position: "asc" },
  });

  let movedCount = 0;
  if (fallback) {
    const result = await prisma.application.updateMany({
      where: { boardColumnId: id },
      data: { boardColumnId: fallback.id },
    });
    movedCount = result.count;
  }

  await prisma.boardColumn.delete({ where: { id } });

  return NextResponse.json({ ok: true, movedApplications: movedCount });
}
