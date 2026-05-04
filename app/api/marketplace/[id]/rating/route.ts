import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeAggregate } from "@/lib/app/marketplace/rating";
import { checkUserRateLimit } from "@/lib/app/marketplace/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = checkUserRateLimit(userId, "rating");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const stars = body?.stars;
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be integer 1..5" }, { status: 400 });
  }

  const target = await prisma.publicResume.findUnique({
    where: { id },
    select: { uploaderUserId: true, status: true },
  });
  if (!target || target.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.uploaderUserId === userId) {
    return NextResponse.json({ error: "Cannot rate your own submission" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.publicResumeRating.upsert({
      where: { publicResumeId_raterUserId: { publicResumeId: id, raterUserId: userId } },
      create: { publicResumeId: id, raterUserId: userId, stars },
      update: { stars },
    });
    await recomputeAggregate(id);
  });

  return NextResponse.json({ ok: true, stars });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.$transaction(async (tx) => {
    await tx.publicResumeRating.deleteMany({
      where: { publicResumeId: id, raterUserId: userId },
    });
    await recomputeAggregate(id);
  });
  return NextResponse.json({ ok: true });
}
