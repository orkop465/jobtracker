import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
    const resumeId = IdSchema.parse(id);

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true },
    });
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const items = await prisma.application.findMany({
      where: { userId, resumeId },
      orderBy: { appliedAt: "desc" },
      take: 200,
      select: {
        id: true,
        company: true,
        roleTitle: true,
        status: true,
        appliedAt: true,
      },
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}
