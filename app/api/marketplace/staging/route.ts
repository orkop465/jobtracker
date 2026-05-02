import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stagingKey, stagingPrefix, LIMITS } from "@/lib/app/marketplace/constants";
import {
  copyObject,
  deletePrefix,
  parseGsPath,
  readBuffer,
  writeBuffer,
} from "@/lib/app/marketplace/storage";
import { looksLikePdf } from "@/lib/app/marketplace/rasterize";

const MAX_BYTES = LIMITS.maxSourceMb * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");

  // Belt-and-suspenders cleanup of any prior in-flight staging objects.
  try {
    await deletePrefix(stagingPrefix(userId));
  } catch (err) {
    console.warn("[marketplace.staging] prefix cleanup failed", err);
  }

  const sessionId = randomUUID();
  const key = stagingKey(userId, sessionId);

  if (mode === "upload") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${LIMITS.maxSourceMb}MB)` },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!looksLikePdf(buf)) {
      return NextResponse.json({ error: "File is not a PDF" }, { status: 400 });
    }
    await writeBuffer(key, buf, "application/pdf");
    return NextResponse.json({ stagingKey: key });
  }

  if (mode === "existing") {
    const resumeId = url.searchParams.get("resumeId");
    if (!resumeId) return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });

    const r = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      select: { gcsPath: true, sizeBytes: true, mimeType: true, roleCategory: true, seniority: true },
    });
    if (!r) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (r.sizeBytes > MAX_BYTES) {
      return NextResponse.json(
        { error: `Resume too large for marketplace (max ${LIMITS.maxSourceMb}MB)` },
        { status: 413 },
      );
    }
    if (r.mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Resume is not a PDF" }, { status: 400 });
    }

    // Verify magic bytes from the actual GCS object before staging.
    const { object } = parseGsPath(r.gcsPath);
    const buf = await readBuffer(object);
    if (!looksLikePdf(buf)) {
      return NextResponse.json({ error: "Source is not a valid PDF" }, { status: 400 });
    }
    await copyObject(r.gcsPath, key);
    return NextResponse.json({
      stagingKey: key,
      prefill: {
        roleCategory: r.roleCategory,
        seniority: r.seniority,
      },
    });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
