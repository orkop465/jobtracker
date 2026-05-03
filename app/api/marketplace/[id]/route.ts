import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/admin";
import { distributionFromRatings, toPublicDto } from "@/lib/app/marketplace/serialize";
import { deleteObject, parseGsPath } from "@/lib/app/marketplace/storage";

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

  // Same-origin proxy URLs (signed URLs need a service-account client_email
  // which user-account ADC doesn't have locally; proxying also keeps bytes
  // behind our auth + visibility check on every fetch).
  const fileUrl = `/api/marketplace/${row.id}/file`;
  const thumbUrl = row.thumbGcsPath ? `/api/marketplace/${row.id}/thumb` : null;

  const isOwn = row.uploaderUserId === userId;
  const exposeStatus = admin || isOwn;

  return NextResponse.json({
    ...toPublicDto(row),
    signedUrl: fileUrl,
    thumbSignedUrl: thumbUrl,
    myRating,
    distribution: distributionFromRatings(row.ratings),
    ...(exposeStatus
      ? {
          status: row.status,
          rejectionReason: row.rejectionReason,
        }
      : {}),
  });
}

// Hard-delete the user's own marketplace submission. Cascades ratings + saves
// via FK; deletes the GCS PDF + thumbnail. Anyone is allowed to remove their
// own submission at any status. Admins can also delete to clean up abuse.
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { uploaderUserId: true, gcsPath: true, thumbGcsPath: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = isAdmin(session);
  if (row.uploaderUserId !== userId && !admin) {
    // Don't reveal existence to non-owners.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // DB row first — same pattern as the private resume delete: a GCS orphan is
  // a cleanup chore, but a row pointing at missing bytes breaks every fetch.
  await prisma.publicResume.delete({ where: { id } });

  // Best-effort GCS cleanup.
  try {
    const { object } = parseGsPath(row.gcsPath);
    await deleteObject(object);
  } catch (err) {
    console.warn(`[marketplace.delete] PDF orphan ${row.gcsPath}`, err);
  }
  if (row.thumbGcsPath) {
    try {
      const { object } = parseGsPath(row.thumbGcsPath);
      await deleteObject(object);
    } catch (err) {
      console.warn(`[marketplace.delete] thumb orphan ${row.thumbGcsPath}`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
