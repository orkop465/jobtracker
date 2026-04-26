import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const UpdateFollowUpSchema = z.object({
  done: z.boolean().optional(),
  snoozedTo: z.string().datetime().optional(),
  title: z.string().min(1).max(200).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.followUp.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.done !== undefined) {
    data.done = parsed.data.done;
    data.doneAt = parsed.data.done ? new Date() : null;
  }

  if (parsed.data.snoozedTo) {
    data.dueDate = new Date(parsed.data.snoozedTo);
    data.snoozedTo = new Date(parsed.data.snoozedTo);
  }

  if (parsed.data.title) data.title = parsed.data.title;
  if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);

  const updated = await prisma.followUp.update({
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
  const existing = await prisma.followUp.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.followUp.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
