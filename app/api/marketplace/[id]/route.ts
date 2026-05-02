import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/admin";
import { distributionFromRatings, toPublicDto } from "@/lib/app/marketplace/serialize";
import { signedReadUrl } from "@/lib/app/marketplace/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const row = await prisma.publicResume.findUnique({
    where: { id },
    include: {
      ratings: { select: { stars: true, raterUserId: true } },
    },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = isAdmin(session);
  if (row.status !== "PUBLISHED" && !admin && row.uploaderUserId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const myRating = row.ratings.find((r) => r.raterUserId === userId)?.stars ?? null;

  const [signed, thumbSigned] = await Promise.all([
    signedReadUrl(row.gcsPath).catch(() => ""),
    row.thumbGcsPath ? signedReadUrl(row.thumbGcsPath).catch(() => "") : Promise.resolve(""),
  ]);

  return NextResponse.json({
    ...toPublicDto(row),
    signedUrl: signed,
    thumbSignedUrl: thumbSigned || null,
    myRating,
    distribution: distributionFromRatings(row.ratings),
  });
}
