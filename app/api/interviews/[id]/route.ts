import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const InterviewTypeEnum = z.enum([
  "RECRUITER_SCREEN", "PHONE_SCREEN", "TECHNICAL", "SYSTEM_DESIGN",
  "BEHAVIORAL", "TAKE_HOME", "ONSITE", "PANEL", "OTHER",
]);

const UpdateInterviewSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(1).max(480).optional(),
  type: InterviewTypeEnum.optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.interview.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateInterviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) data.scheduledAt = new Date(parsed.data.scheduledAt);

  const updated = await prisma.interview.update({
    where: { id },
    data,
    include: { application: { select: { company: true, roleTitle: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.interview.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.interview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
