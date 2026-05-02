import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [total, ratingsThisMonth] = await Promise.all([
    prisma.publicResume.count({ where: { status: "PUBLISHED" } }),
    prisma.publicResumeRating.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return NextResponse.json({ total, placed: 0, ratingsThisMonth });
}
