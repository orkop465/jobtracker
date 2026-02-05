import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { prisma } from "@/lib/prisma";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const storage = new Storage();

export async function GET() {
  const items = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    const MAX_BYTES = 2 * 1024 * 1024;

    const bucketName = mustGetEnv("RESUMES_BUCKET");

    const form = await req.formData();
    const label = String(form.get("label") ?? "").trim();
    const file = form.get("file");

    if (!label) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const safeName = (file.name || "resume.pdf").replace(/[^\w.\-() ]+/g, "_");
    const prefix = process.env.NODE_ENV === "production" ? "prod" : "dev";
    const objectName = `resumes/${prefix}/${Date.now()}-${safeName}`;

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
        label,
        gcsPath,
        filename: safeName,
        mimeType: "application/pdf",
        sizeBytes: bytes.length,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
