import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Storage } from "@google-cloud/storage";
import { z } from "zod";

const storage = new Storage();
const IdSchema = z.string().min(1);

function parseGsPath(gsPath: string) {
  if (!gsPath.startsWith("gs://")) throw new Error("Invalid gcsPath format");
  const without = gsPath.slice("gs://".length);
  const firstSlash = without.indexOf("/");
  if (firstSlash === -1) throw new Error("Invalid gcsPath format");
  const bucket = without.slice(0, firstSlash);
  const object = without.slice(firstSlash + 1);
  if (!bucket || !object) throw new Error("Invalid gcsPath format");
  return { bucket, object };
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const resumeId = IdSchema.parse(id);

    // Later (Phase 4 auth): verify ownership here.
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, gcsPath: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const { bucket, object } = parseGsPath(resume.gcsPath);

    // Delete DB row first or storage first?
    // We delete storage first so we don't orphan objects if delete fails.
    await storage.bucket(bucket).file(object).delete({ ignoreNotFound: true });

    await prisma.resume.delete({ where: { id: resumeId } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
