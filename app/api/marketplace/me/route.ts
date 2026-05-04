import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toMySubmissionDto } from "@/lib/app/marketplace/serialize";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.publicResume.findMany({
    where: { uploaderUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items: items.map(toMySubmissionDto) });
}
