import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seedDefaultResumeTags } from "@/lib/resumes/seed-default-tags";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedDefaultResumeTags(userId, prisma);

  const tags = await prisma.resumeTag.findMany({
    where: { userId },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      position: t.position,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const color = typeof body?.color === "string" ? body.color : null;
  if (!name || name.length > 40) {
    return NextResponse.json({ error: "Name is required (max 40 chars)" }, { status: 400 });
  }

  const last = await prisma.resumeTag.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
  });

  try {
    const tag = await prisma.resumeTag.create({
      data: {
        userId,
        name,
        color,
        position: (last?.position ?? -1) + 1,
      },
    });
    return NextResponse.json(
      { tag: { id: tag.id, name: tag.name, color: tag.color, position: tag.position } },
      { status: 201 },
    );
  } catch (err: unknown) {
    // Prisma unique-violation on (userId, name) → 409
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 400 },
    );
  }
}
