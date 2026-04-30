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
  const data: { name?: string; color?: string | null } = {};

  if (body && typeof body === "object" && "name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 60) {
      return NextResponse.json(
        { error: "Name is required (max 60 chars)" },
        { status: 400 },
      );
    }
    data.name = name;
  }

  if (body && typeof body === "object" && "color" in body) {
    const raw = body.color;
    if (raw === null || raw === "") {
      data.color = null;
    } else if (typeof raw === "string" && raw.length <= 60) {
      data.color = raw;
    } else {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.boardColumn.update({ where: { id }, data });

  return NextResponse.json({
    column: {
      id: updated.id,
      name: updated.name,
      position: updated.position,
      mappedStatus: updated.mappedStatus,
      color: updated.color,
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
