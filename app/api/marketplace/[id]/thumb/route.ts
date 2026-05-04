import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth/admin";
import { parseGsPath, storage } from "@/lib/app/marketplace/storage";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const row = await prisma.publicResume.findUnique({
    where: { id },
    select: { thumbGcsPath: true, status: true, uploaderUserId: true },
  });
  if (!row?.thumbGcsPath) return new Response("Not found", { status: 404 });

  const admin = isAdmin(session);
  const isOwn = row.uploaderUserId === userId;
  if (row.status !== "PUBLISHED" && !admin && !isOwn) {
    return new Response("Not found", { status: 404 });
  }

  const { bucket, object } = parseGsPath(row.thumbGcsPath);
  const file = storage().bucket(bucket).file(object);

  const nodeStream = file.createReadStream();
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => {
        console.error(`[marketplace.thumb] stream error for ${id}`, err);
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
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
