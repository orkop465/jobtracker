import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Saving requires the resume to exist and be currently published. Anything
  // else (pending, rejected, unpublished) should not be discoverable by save.
  const target = await prisma.publicResume.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!target || target.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.publicResumeSave.upsert({
    where: { publicResumeId_saverUserId: { publicResumeId: id, saverUserId: userId } },
    create: { publicResumeId: id, saverUserId: userId },
    update: {},
  });

  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.publicResumeSave.deleteMany({
    where: { publicResumeId: id, saverUserId: userId },
  });
  return NextResponse.json({ ok: true, saved: false });
}
