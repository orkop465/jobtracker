import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const storage = new Storage();

// PDF files always start with the magic bytes "%PDF-" (0x25 0x50 0x44 0x46 0x2D).
// We verify this server-side instead of trusting the client-supplied multipart
// MIME type, which can be forged by a malicious request.
const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
function looksLikePdf(bytes: Buffer): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  return bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      _count: { select: { applications: true } },
      tags: {
        include: { tag: true },
      },
    },
  });

  // One extra query to fetch the most recent appliedAt per resume. Two
  // round-trips total (resumes + last-applied) keeps the page-load cost
  // bounded regardless of resume count.
  const resumeIds = resumes.map((r) => r.id);
  const lastApplied =
    resumeIds.length === 0
      ? []
      : await prisma.application.groupBy({
          by: ["resumeId"],
          where: { userId, resumeId: { in: resumeIds } },
          _max: { appliedAt: true },
        });
  const lastByResume = new Map<string, string>();
  for (const row of lastApplied) {
    if (row.resumeId && row._max.appliedAt) {
      lastByResume.set(row.resumeId, row._max.appliedAt.toISOString());
    }
  }

  const items = resumes.map((r) => ({
    id: r.id,
    label: r.label,
    filename: r.filename,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    createdAt: r.createdAt,
    gcsPath: r.gcsPath,
    sentCount: r._count.applications,
    lastAppliedAt: lastByResume.get(r.id) ?? null,
    tags: r.tags.map((rt) => ({
      id: rt.tag.id,
      name: rt.tag.name,
      color: rt.tag.color,
    })),
  }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const MAX_BYTES = 2 * 1024 * 1024; // 2MB

    const bucketName = mustGetEnv("RESUMES_BUCKET");

    const form = await req.formData();
    const label = String(form.get("label") ?? "").trim();
    const file = form.get("file");

    if (!label) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }
    if (label.length > 120) {
      return NextResponse.json({ error: "Label is too long" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Verify the actual file content is a PDF — do NOT trust file.type, which
    // is the client-supplied multipart MIME and can be forged by anyone.
    if (!looksLikePdf(bytes)) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const safeName = (file.name || "resume.pdf").replace(/[^\w.\-() ]+/g, "_");
    const envPrefix = process.env.NODE_ENV === "production" ? "prod" : "dev";

    // Cryptographically unique key — eliminates collisions when two requests
    // upload identically-named files within the same millisecond. Includes
    // userId so bucket listings are naturally tenant-separated.
    const objectName = `resumes/${envPrefix}/${userId}/${randomUUID()}-${safeName}`;
    const gcsPath = `gs://${bucketName}/${objectName}`;

    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(objectName);

    await gcsFile.save(bytes, {
      contentType: "application/pdf",
      resumable: false,
      metadata: { cacheControl: "private, max-age=0, no-transform" },
    });

    const created = await prisma.resume.create({
      data: {
        userId,
        label,
        gcsPath,
        filename: safeName,
        mimeType: "application/pdf",
        sizeBytes: bytes.length,
      },
    });

    return NextResponse.json(
      {
        item: {
          id: created.id,
          label: created.label,
          filename: created.filename,
          mimeType: created.mimeType,
          sizeBytes: created.sizeBytes,
          createdAt: created.createdAt,
          gcsPath: created.gcsPath,
          sentCount: 0,
          lastAppliedAt: null,
          tags: [],
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
