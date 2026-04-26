import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const InterviewTypeEnum = z.enum([
  "RECRUITER_SCREEN", "PHONE_SCREEN", "TECHNICAL", "SYSTEM_DESIGN",
  "BEHAVIORAL", "TAKE_HOME", "ONSITE", "PANEL", "OTHER",
]);

const CreateInterviewSchema = z.object({
  applicationId: z.string().min(1),
  title: z.string().min(1).max(200),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(1).max(480).optional(),
  type: InterviewTypeEnum.optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = { userId };
  if (from || to) {
    const scheduledAt: Record<string, Date> = {};
    if (from) scheduledAt.gte = new Date(from);
    if (to) scheduledAt.lte = new Date(to);
    where.scheduledAt = scheduledAt;
  }

  const items = await prisma.interview.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 50,
    include: {
      application: { select: { company: true, roleTitle: true } },
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId },
  });
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const interview = await prisma.interview.create({
    data: {
      userId,
      applicationId: parsed.data.applicationId,
      title: parsed.data.title,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMin: parsed.data.durationMin,
      type: parsed.data.type || "OTHER",
      location: parsed.data.location,
      notes: parsed.data.notes,
    },
    include: {
      application: { select: { company: true, roleTitle: true } },
    },
  });

  return NextResponse.json(interview, { status: 201 });
}
