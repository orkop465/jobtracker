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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const resumeId = IdSchema.parse(id);

    // NOTE: once auth exists, check resume.userId matches session user here.
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      select: { gcsPath: true, filename: true, mimeType: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const { bucket, object } = parseGsPath(resume.gcsPath);
    const file = storage.bucket(bucket).file(object);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 2 * 60 * 1000, // 2 minutes
      responseType: resume.mimeType || "application/pdf",
      responseDisposition: `inline; filename="${resume.filename || "resume.pdf"}"`,
    });

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
