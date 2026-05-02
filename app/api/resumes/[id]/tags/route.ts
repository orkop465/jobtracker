import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Body = z.object({ tagIds: z.array(z.string().min(1)) });

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: resumeId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "tagIds must be an array of strings" }, { status: 400 });
  }
  const tagIds = Array.from(new Set(parsed.data.tagIds));

  // Ownership: resume must belong to user.
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    select: { id: true },
  });
  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  // Ownership: every tag id must belong to the same user.
  if (tagIds.length > 0) {
    const owned = await prisma.resumeTag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    });
    if (owned.length !== tagIds.length) {
      return NextResponse.json({ error: "One or more tags not found" }, { status: 404 });
    }
  }

  await prisma.$transaction([
    prisma.resumeTagOnResume.deleteMany({ where: { resumeId } }),
    ...(tagIds.length > 0
      ? [
          prisma.resumeTagOnResume.createMany({
            data: tagIds.map((tagId) => ({ resumeId, tagId })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, tagIds });
}
