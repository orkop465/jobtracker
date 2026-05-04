import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toPublicDto } from "@/lib/app/marketplace/serialize";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saves = await prisma.publicResumeSave.findMany({
    where: { saverUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      publicResume: true,
    },
  });

  // Hide saved entries pointing at unpublished/rejected resumes — user
  // shouldn't see anything they couldn't have saved fresh.
  const items = saves
    .filter((s) => s.publicResume.status === "PUBLISHED")
    .map((s) => ({
      ...toPublicDto(s.publicResume),
      thumbUrl: s.publicResume.thumbGcsPath
        ? `/api/marketplace/${s.publicResume.id}/thumb`
        : null,
      savedAt: s.createdAt.toISOString(),
    }));

  return NextResponse.json({
    items,
    savedIds: items.map((i) => i.id),
  });
}
