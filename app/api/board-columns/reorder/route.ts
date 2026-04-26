import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const columnIds: unknown = body?.columnIds;
  if (!Array.isArray(columnIds) || columnIds.length === 0) {
    return NextResponse.json({ error: "columnIds array is required" }, { status: 400 });
  }

  const columns = await prisma.boardColumn.findMany({ where: { userId } });
  const owned = new Set(columns.map((c) => c.id));
  if (!columnIds.every((id) => typeof id === "string" && owned.has(id))) {
    return NextResponse.json({ error: "Invalid column IDs" }, { status: 400 });
  }

  await prisma.$transaction(
    columnIds.map((id, i) =>
      prisma.boardColumn.update({ where: { id: id as string }, data: { position: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
