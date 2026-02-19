import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const CreateApplicationSchema = z.object({
  company: z.string().min(1).max(120),
  roleTitle: z.string().min(1).max(160),
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
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.application.findMany({
    where: { userId },
    include: {
      resume: true,
    },
    orderBy: { appliedAt: "desc" },
    take: 50,
  });

  const items = apps.map((app) => ({
    ...app,
    // Defense-in-depth: never return a resume if ownership is inconsistent.
    resume:
      app.resume && app.resume.userId === userId
        ? app.resume
        : null,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateApplicationSchema.parse(body);
    let resumeIdToSet: string | null = null;

    if (typeof parsed.resumeId === "string") {
      const trimmed = parsed.resumeId.trim();
      if (trimmed) {
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

    const created = await prisma.application.create({
      data: {
        userId,
        company: parsed.company.trim(),
        roleTitle: parsed.roleTitle.trim(),
        jobUrl: parsed.jobUrl ? parsed.jobUrl : null,
        location: parsed.location ? parsed.location : null,
        status: parsed.status ?? "APPLIED",
        appliedAt: parsed.appliedAt ? new Date(parsed.appliedAt) : new Date(),
        resumeId: resumeIdToSet,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: any) {
    // Keep errors consistent and JSON-parse-safe on the client.
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
