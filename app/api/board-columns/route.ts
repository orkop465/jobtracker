import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seedDefaultColumns } from "@/lib/board/seed-defaults";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedDefaultColumns(userId, prisma);

  const columns = await prisma.boardColumn.findMany({
    where: { userId },
    orderBy: { position: "asc" },
    include: { _count: { select: { applications: true } } },
  });

  return NextResponse.json({
    columns: columns.map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
      mappedStatus: c.mappedStatus,
      color: c.color,
      applicationCount: c._count.applications,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Name is required (max 60 chars)" }, { status: 400 });
  }

  const last = await prisma.boardColumn.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
  });

  const column = await prisma.boardColumn.create({
    data: {
      userId,
      name,
      position: (last?.position ?? -1) + 1,
      mappedStatus: null,
    },
  });

  return NextResponse.json(
    {
      column: {
        id: column.id,
        name: column.name,
        position: column.position,
        mappedStatus: null,
        color: null,
        applicationCount: 0,
      },
    },
    { status: 201 }
  );
}
