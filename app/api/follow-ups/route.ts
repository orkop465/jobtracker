import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const CreateFollowUpSchema = z.object({
  applicationId: z.string().min(1),
  title: z.string().min(1).max(200),
  dueDate: z.string().datetime(),
});

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.followUp.findMany({
    where: { userId },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
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
  const parsed = CreateFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Verify application belongs to user
  const app = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, userId },
  });
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      userId,
      applicationId: parsed.data.applicationId,
      title: parsed.data.title,
      dueDate: new Date(parsed.data.dueDate),
    },
    include: {
      application: { select: { company: true, roleTitle: true } },
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
