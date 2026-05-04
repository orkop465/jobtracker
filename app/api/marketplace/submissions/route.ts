import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, publicResumeKey, publicResumeThumbKey, stagingPrefix } from "@/lib/app/marketplace/constants";
import { checkSubmissionCap } from "@/lib/app/marketplace/cap";
import { checkUserRateLimit } from "@/lib/app/marketplace/rate-limit";
import { rasterize, validateRectangles } from "@/lib/app/marketplace/rasterize";
import { logRasterize, logRasterizeError } from "@/lib/app/marketplace/log";
import {
  deleteObject,
  readBuffer,
  writeBuffer,
} from "@/lib/app/marketplace/storage";
import type { MarketplaceRoleCategory, MarketplaceSeniority } from "@prisma/client";

const ROLE_SET = new Set([
  "SWE",
  "PM",
  "DESIGN",
  "DATA",
  "ML",
  "DEVOPS",
  "SECURITY",
  "OTHER",
]);
const SEN_SET = new Set(["STUDENT", "INTERN", "ENTRY", "MID", "SENIOR", "STAFF_PLUS"]);

const MAX_OUTPUT_BYTES = LIMITS.maxOutputMb * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = checkUserRateLimit(userId, "submission");
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const cap = await checkSubmissionCap(userId);
  if (!cap.ok) {
    return NextResponse.json(
      {
        error: "Submission cap reached",
        pending: cap.pending,
        published: cap.published,
        limits: { pending: LIMITS.pendingPerUser, published: LIMITS.publishedPerUser },
      },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  if (b.affirmed !== true) {
    return NextResponse.json({ error: "Affirmation required" }, { status: 400 });
  }
  const stagingKey = typeof b.stagingKey === "string" ? b.stagingKey : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const role = typeof b.roleCategory === "string" ? b.roleCategory.toUpperCase() : "";
  const sen = typeof b.seniority === "string" ? b.seniority.toUpperCase() : "";
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 500) : "";

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (title.length > 100) return NextResponse.json({ error: "Title too long" }, { status: 400 });
  if (!ROLE_SET.has(role)) return NextResponse.json({ error: "Invalid roleCategory" }, { status: 400 });
  if (!SEN_SET.has(sen)) return NextResponse.json({ error: "Invalid seniority" }, { status: 400 });

  let rectangles;
  try {
    rectangles = validateRectangles(b.rectangles);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid rectangles" },
      { status: 400 },
    );
  }

  // Path ownership check — staging key must be inside this user's prefix.
  if (!stagingKey.startsWith(stagingPrefix(userId))) {
    return NextResponse.json({ error: "Invalid source" }, { status: 403 });
  }

  let sourcePdf: Buffer;
  try {
    sourcePdf = await readBuffer(stagingKey);
  } catch {
    return NextResponse.json({ error: "Source not found" }, { status: 403 });
  }

  const t0 = Date.now();
  let result;
  try {
    result = await rasterize({ sourcePdf, rectangles, title });
  } catch (e: unknown) {
    logRasterizeError({
      userId,
      message: e instanceof Error ? e.message : String(e),
    });
    const msg = e instanceof Error ? e.message : "Processing failed";
    if (msg.includes("max")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  if (result.pdfBytes.byteLength > MAX_OUTPUT_BYTES) {
    return NextResponse.json(
      { error: `Output too large (${LIMITS.maxOutputMb}MB max); try fewer pages` },
      { status: 400 },
    );
  }

  // Pre-generate the id so we can use it as the storage key.
  const created = await prisma.publicResume.create({
    data: {
      uploaderUserId: userId,
      title,
      roleCategory: role as MarketplaceRoleCategory,
      seniority: sen as MarketplaceSeniority,
      notes: notes || null,
      gcsPath: "pending",
      pageCount: result.pageCount,
      sizeBytes: result.pdfBytes.byteLength,
    },
    select: { id: true },
  });

  const pdfKey = publicResumeKey(created.id);
  const thumbKey = publicResumeThumbKey(created.id);
  const pdfGsPath = await writeBuffer(pdfKey, Buffer.from(result.pdfBytes), "application/pdf");
  const thumbGsPath = await writeBuffer(
    thumbKey,
    Buffer.from(result.thumbBytes),
    "image/jpeg",
  );

  await prisma.publicResume.update({
    where: { id: created.id },
    data: { gcsPath: pdfGsPath, thumbGcsPath: thumbGsPath },
  });

  // Best-effort staging cleanup.
  deleteObject(stagingKey).catch((err) =>
    console.warn("[marketplace.submissions] staging cleanup failed", err),
  );

  logRasterize({
    userId,
    pageCount: result.pageCount,
    inputBytes: sourcePdf.byteLength,
    outputBytes: result.pdfBytes.byteLength,
    durationMs: Date.now() - t0,
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
