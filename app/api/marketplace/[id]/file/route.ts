import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/admin";
import { parseGsPath, storage } from "@/lib/app/marketplace/storage";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

// Streams the published PDF for a marketplace resume to authenticated viewers.
// Visibility: PUBLISHED to anyone signed in; PENDING/REJECTED/UNPUBLISHED to
// the uploader (so My submissions can still preview it) and to admins.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { gcsPath: true, status: true, uploaderUserId: true },
  });
  if (!row) return new Response("Not found", { status: 404 });

  const admin = isAdmin(session);
  const isOwn = row.uploaderUserId === userId;
  if (row.status !== "PUBLISHED" && !admin && !isOwn) {
    return new Response("Not found", { status: 404 });
  }

  const { bucket, object } = parseGsPath(row.gcsPath);
  const file = storage().bucket(bucket).file(object);

  const nodeStream = file.createReadStream();
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => {
        console.error(`[marketplace.file] stream error for ${id}`, err);
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resume-${id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
