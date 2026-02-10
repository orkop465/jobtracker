import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Storage } from "@google-cloud/storage";
import { z } from "zod";
import { auth } from "@/auth";

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

type Ctx = { params: { id: string } };

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: Request, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const resumeId = IdSchema.parse(ctx.params.id);

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { gcsPath: true, filename: true, mimeType: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const urlObj = new URL(req.url);
    const download = urlObj.searchParams.get("download") === "1";

    const { bucket, object } = parseGsPath(resume.gcsPath);
    const file = storage.bucket(bucket).file(object);

    const filename = resume.filename || "resume.pdf";
    const disposition = download ? "attachment" : "inline";

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      // Longer-lived per your preference. You can tune later.
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
      responseType: resume.mimeType || "application/pdf",
      responseDisposition: `${disposition}; filename="${filename}"`,
    });

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
