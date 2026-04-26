import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

const UpdateGoalSchema = z.object({
  weeklyGoal: z.number().int().min(1).max(100),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { weeklyGoal: parsed.data.weeklyGoal },
    select: { weeklyGoal: true },
  });

  return NextResponse.json(user);
}
