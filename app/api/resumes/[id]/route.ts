import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Storage } from "@google-cloud/storage";
import { z } from "zod";
import { auth } from "@/auth";
import type { MarketplaceRoleCategory, MarketplaceSeniority } from "@prisma/client";

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

    // Delete the database row FIRST. If GCS deletion fails afterward, the
    // file is orphaned (a recoverable problem — easy to clean up via a
    // sweep job) instead of having a Resume row pointing at a file that
    // no longer exists (which breaks the view-signed-URL flow for the user).
    const del = await prisma.resume.deleteMany({ where: { id: resumeId, userId } });
    if (del.count !== 1) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    try {
      await storage.bucket(bucket).file(object).delete({ ignoreNotFound: true });
    } catch (gcsErr) {
      // The DB row is already gone — log the orphan but report success to
      // the user. A future cleanup job can sweep storage for orphans.
      console.error(
        `[resume-delete] GCS object orphaned: gs://${bucket}/${object}`,
        gcsErr
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

const ROLE_SET = new Set(["SWE", "PM", "DESIGN", "DATA", "ML", "DEVOPS", "SECURITY", "OTHER"]);
const SEN_SET = new Set(["STUDENT", "INTERN", "ENTRY", "MID", "SENIOR", "STAFF_PLUS"]);

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const resumeId = IdSchema.parse(id);

  const body = await req.json().catch(() => null);
  const data: Partial<{
    label: string;
    roleCategory: MarketplaceRoleCategory | null;
    seniority: MarketplaceSeniority | null;
  }> = {};
  if (typeof body?.label === "string") {
    const label = body.label.trim();
    if (!label || label.length > 120) {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }
    data.label = label;
  }
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "roleCategory")) {
    const r = body.roleCategory;
    if (r === null) data.roleCategory = null;
    else if (typeof r === "string" && ROLE_SET.has(r.toUpperCase())) {
      data.roleCategory = r.toUpperCase() as MarketplaceRoleCategory;
    } else return NextResponse.json({ error: "Invalid roleCategory" }, { status: 400 });
  }
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "seniority")) {
    const s = body.seniority;
    if (s === null) data.seniority = null;
    else if (typeof s === "string" && SEN_SET.has(s.toUpperCase())) {
      data.seniority = s.toUpperCase() as MarketplaceSeniority;
    } else return NextResponse.json({ error: "Invalid seniority" }, { status: 400 });
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.resume.updateMany({
    where: { id: resumeId, userId },
    data,
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const fresh = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, label: true, roleCategory: true, seniority: true },
  });
  return NextResponse.json({ item: fresh });
}
