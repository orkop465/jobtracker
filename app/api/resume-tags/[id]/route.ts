import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  const data: { name?: string; color?: string | null; position?: number } = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 40) {
      return NextResponse.json({ error: "Name is required (max 40 chars)" }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body?.color === "string" || body?.color === null) data.color = body.color;
  if (typeof body?.position === "number") data.position = body.position;

  const result = await prisma.resumeTag.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  const tag = await prisma.resumeTag.findUnique({ where: { id } });
  return NextResponse.json({
    tag: tag && {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      position: tag.position,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await prisma.resumeTag.deleteMany({ where: { id, userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
