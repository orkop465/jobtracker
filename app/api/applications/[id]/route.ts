import { NextResponse } from "next/server";
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
      .enum(["APPLIED", "SCREEN", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"])
      .optional(),
    appliedAt: z.string().datetime().optional(),
    resumeId: z.string().optional().or(z.literal("")), // optional attach/detach
  })
  .strict();

type Ctx = { params: { id: string } };

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = ctx.params.id;

  const app = await prisma.application.findFirst({
    where: { id, userId },
    include: { resume: true },
  });

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: app });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = ctx.params.id;

  try {
    const body = await req.json().catch(() => null);
    const parsed = UpdateApplicationSchema.parse(body);

    // If resumeId is being set, enforce that the resume belongs to this user.
    // Empty string means detach.
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

    // updateMany enforces ownership (id alone is unique, but that would bypass userId).
    const result = await prisma.application.updateMany({
      where: { id, userId },
      data,
    });

    if (result.count !== 1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.application.findFirst({
      where: { id, userId },
      include: { resume: true },
    });

    return NextResponse.json({ item: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = ctx.params.id;

  // deleteMany enforces ownership safely
  const result = await prisma.application.deleteMany({
    where: { id, userId },
  });

  if (result.count !== 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
