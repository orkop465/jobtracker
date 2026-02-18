import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const UpdateApplicationSchema = z
  .object({
    company: z.string().min(1).max(120).optional(),
    roleTitle: z.string().min(1).max(160).optional(),
    jobUrl: z.string().url().optional().or(z.literal("")),
    location: z.string().max(120).optional().or(z.literal("")),
    status: z
      .enum([
        "APPLIED",
        "RECRUITER_SCREEN",
        "OA",
        "INTERVIEW_ROUND_1",
        "INTERVIEW_ROUND_2",
        "INTERVIEW_ROUND_3",
        "OFFER",
        "REJECTED",
        "WITHDRAWN",
        "GHOSTED",
      ])
      .optional(),
    appliedAt: z.string().datetime().optional(),
    resumeId: z.string().optional().or(z.literal("")),
  })
  .strict();

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const app = await prisma.application.findFirst({
    where: { id, userId },
    include: { resume: true },
  });

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const item = {
    ...app,
    // Defense-in-depth for legacy or corrupted cross-tenant resume links.
    resume: app.resume && app.resume.userId === userId ? app.resume : null,
  };
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => null);
    const parsed = UpdateApplicationSchema.parse(body);

    let resumeIdToSet: string | null | undefined = undefined;
    if (typeof parsed.resumeId === "string") {
      const trimmed = parsed.resumeId.trim();
      if (!trimmed) {
        resumeIdToSet = null;
      } else {
        const resume = await prisma.resume.findFirst({
          where: { id: trimmed, userId },
          select: { id: true },
        });
        if (!resume) {
          return NextResponse.json({ error: "Invalid resumeId" }, { status: 400 });
        }
        resumeIdToSet = resume.id;
      }
    }

    const data: Record<string, any> = {};
    if (typeof parsed.company === "string") data.company = parsed.company.trim();
    if (typeof parsed.roleTitle === "string") data.roleTitle = parsed.roleTitle.trim();
    if (typeof parsed.jobUrl === "string") data.jobUrl = parsed.jobUrl ? parsed.jobUrl : null;
    if (typeof parsed.location === "string") data.location = parsed.location ? parsed.location : null;
    if (typeof parsed.status === "string") data.status = parsed.status;
    if (typeof parsed.appliedAt === "string") data.appliedAt = new Date(parsed.appliedAt);
    if (resumeIdToSet !== undefined) data.resumeId = resumeIdToSet;

    const current = await prisma.application.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const statusChanged =
      typeof parsed.status === "string" && parsed.status !== current.status;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.updateMany({
        where: { id, userId },
        data,
      });

      if (updated.count !== 1) return { ok: false as const };

      if (statusChanged) {
        await tx.applicationStatusEvent.create({
          data: {
            userId,
            applicationId: id,
            fromStatus: current.status,
            toStatus: parsed.status!,
          },
        });
      }

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.application.findFirst({
      where: { id, userId },
      include: { resume: true },
    });

    const item = updated
      ? {
          ...updated,
          resume:
            updated.resume && updated.resume.userId === userId
              ? updated.resume
              : null,
        }
      : null;

    return NextResponse.json({ item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const result = await prisma.application.deleteMany({
    where: { id, userId },
  });

  if (result.count !== 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
