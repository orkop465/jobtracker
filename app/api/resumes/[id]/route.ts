import { NextResponse, type NextRequest } from "next/server";
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

type Ctx = { params: Promise<{ id: string }> };

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const resumeId = IdSchema.parse(id);

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { id: true, gcsPath: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const { bucket, object } = parseGsPath(resume.gcsPath);

    await storage.bucket(bucket).file(object).delete({ ignoreNotFound: true });

    const del = await prisma.resume.deleteMany({ where: { id: resumeId, userId } });
    if (del.count !== 1) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 400 });
  }
}
