import { NextResponse, type NextRequest } from "next/server";
import { Prisma, type ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z, ZodError } from "zod";
import { auth } from "@/auth";

const FIELD_LABELS: Record<string, string> = {
  company: "Company",
  roleTitle: "Role title",
  jobUrl: "Job URL",
  location: "Location",
  status: "Status",
  appliedAt: "Applied date",
  resumeId: "Resume",
  salaryMin: "Min salary",
  salaryMax: "Max salary",
  currency: "Currency",
  contactName: "Contact name",
  contactEmail: "Contact email",
  contactLinkedIn: "Contact LinkedIn",
  notes: "Notes",
  source: "Source",
  jobDescription: "Job description",
  priority: "Priority",
  nextFollowUp: "Follow-up date",
  boardColumnId: "Board column",
};

function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    if (!first) return "Invalid input";
    const fieldKey = first.path[0];
    const label =
      typeof fieldKey === "string" && FIELD_LABELS[fieldKey]
        ? FIELD_LABELS[fieldKey]
        : typeof fieldKey === "string"
        ? fieldKey
        : "Input";
    return `${label}: ${first.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

const UpdateApplicationSchema = z
  .object({
    company: z.string().min(1, "is required").max(120, "is too long").optional(),
    roleTitle: z.string().min(1, "is required").max(160, "is too long").optional(),
    jobUrl: z
      .string()
      .url("must be a full URL like https://example.com")
      .optional()
      .or(z.literal("")),
    location: z.string().max(120, "is too long").optional().or(z.literal("")),
    status: z
      .enum([
        "APPLIED",
        "RECRUITER_SCREEN",
        "OA",
        "INTERVIEW_ROUND_1",
        "INTERVIEW_ROUND_2",
        "INTERVIEW_ROUND_3",
        "OFFER",
        "REJECTED",
        "WITHDRAWN",
        "GHOSTED",
      ])
      .optional(),
    appliedAt: z.string().datetime("must be a valid date").optional(),
    resumeId: z.string().optional().or(z.literal("")),
    salaryMin: z
      .number()
      .int("must be a whole number")
      .min(0, "cannot be negative")
      .optional()
      .nullable(),
    salaryMax: z
      .number()
      .int("must be a whole number")
      .min(0, "cannot be negative")
      .optional()
      .nullable(),
    currency: z.string().max(3, "must be a 3-letter code").optional().or(z.literal("")),
    contactName: z.string().max(120, "is too long").optional().or(z.literal("")),
    contactEmail: z
      .string()
      .email("must be a valid email")
      .optional()
      .or(z.literal("")),
    contactLinkedIn: z.string().max(500, "is too long").optional().or(z.literal("")),
    notes: z.string().max(10000, "exceeds 10,000 characters").optional().or(z.literal("")),
    source: z
      .enum([
        "LINKEDIN",
        "INDEED",
        "GLASSDOOR",
        "COMPANY_WEBSITE",
        "REFERRAL",
        "RECRUITER_OUTREACH",
        "JOB_BOARD",
        "CAREER_FAIR",
        "OTHER",
      ])
      .optional()
      .nullable(),
    jobDescription: z
      .string()
      .max(50000, "exceeds 50,000 characters")
      .optional()
      .or(z.literal("")),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().nullable(),
    nextFollowUp: z
      .string()
      .datetime("must be a valid date")
      .optional()
      .or(z.literal(""))
      .nullable(),
    boardColumnId: z.string().optional().nullable(),
    position: z.number().optional().nullable(),
  })
  .strict()
  .refine(
    (d) => !(d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax),
    { message: "must not exceed Max salary", path: ["salaryMin"] },
  );

async function getUserIdOrNull() {
  const session = await auth();
  return session?.user?.id ?? null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const app = await prisma.application.findFirst({
    where: { id, userId },
    include: { resume: true },
  });

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const item = {
    ...app,
    // Defense-in-depth for legacy or corrupted cross-tenant resume links.
    resume: app.resume && app.resume.userId === userId ? app.resume : null,
  };
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => null);
    const parsed = UpdateApplicationSchema.parse(body);

    let resumeIdToSet: string | null | undefined = undefined;
    if (typeof parsed.resumeId === "string") {
      const trimmed = parsed.resumeId.trim();
      if (!trimmed) {
        resumeIdToSet = null;
      } else {
        const resume = await prisma.resume.findFirst({
          where: { id: trimmed, userId },
          select: { id: true },
        });
        if (!resume) {
          return NextResponse.json({ error: "Invalid resumeId" }, { status: 400 });
        }
        resumeIdToSet = resume.id;
      }
    }

    const data: Prisma.ApplicationUncheckedUpdateManyInput = {};
    if (typeof parsed.company === "string") data.company = parsed.company.trim();
    if (typeof parsed.roleTitle === "string") data.roleTitle = parsed.roleTitle.trim();
    if (typeof parsed.jobUrl === "string") data.jobUrl = parsed.jobUrl || null;
    if (typeof parsed.location === "string") data.location = parsed.location || null;
    if (typeof parsed.status === "string") data.status = parsed.status;
    if (typeof parsed.appliedAt === "string") data.appliedAt = new Date(parsed.appliedAt);
    if (resumeIdToSet !== undefined) data.resumeId = resumeIdToSet;

    if (parsed.salaryMin !== undefined) data.salaryMin = parsed.salaryMin;
    if (parsed.salaryMax !== undefined) data.salaryMax = parsed.salaryMax;
    if (typeof parsed.currency === "string") data.currency = parsed.currency || null;
    if (typeof parsed.contactName === "string") data.contactName = parsed.contactName.trim() || null;
    if (typeof parsed.contactEmail === "string") data.contactEmail = parsed.contactEmail.trim() || null;
    if (typeof parsed.contactLinkedIn === "string") data.contactLinkedIn = parsed.contactLinkedIn.trim() || null;
    if (typeof parsed.notes === "string") data.notes = parsed.notes.trim() || null;
    if (parsed.source !== undefined) data.source = parsed.source;
    if (typeof parsed.jobDescription === "string") data.jobDescription = parsed.jobDescription.trim() || null;
    if (parsed.priority !== undefined) data.priority = parsed.priority;
    if (parsed.nextFollowUp !== undefined) {
      data.nextFollowUp = parsed.nextFollowUp ? new Date(parsed.nextFollowUp) : null;
    }

    if (parsed.position !== undefined && parsed.position !== null) {
      data.position = parsed.position;
    }

    // Race-safe update: read the current row inside the transaction and
    // condition the write on the exact status we observed. If two PATCHes
    // race, only one matches the conditional updateMany — the loser gets
    // count: 0 and we surface a 409 so the client can refetch and retry.
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.application.findFirst({
        where: { id, userId },
        select: { id: true, status: true, boardColumnId: true },
      });
      if (!current) return { ok: false as const, reason: "not_found" };

      // Board column move (explicit)
      if (parsed.boardColumnId !== undefined) {
        if (parsed.boardColumnId) {
          const targetCol = await tx.boardColumn.findFirst({
            where: { id: parsed.boardColumnId, userId },
          });
          if (!targetCol) {
            return { ok: false as const, reason: "invalid_column" };
          }
          data.boardColumnId = targetCol.id;
          // If column maps to a status, sync the status
          if (targetCol.mappedStatus && targetCol.mappedStatus !== current.status) {
            data.status = targetCol.mappedStatus;
          }
        } else {
          data.boardColumnId = null;
        }
      }

      // Status-only change: keep boardColumnId in sync. If the status
      // change came from the form (not from a column move), find the
      // column whose mappedStatus matches the new status and move the
      // card there. This makes status the single source of truth from
      // the user's perspective — they pick a status, the column
      // follows automatically.
      if (
        data.status &&
        data.status !== current.status &&
        data.boardColumnId === undefined
      ) {
        const targetCol = await tx.boardColumn.findFirst({
          where: { userId, mappedStatus: data.status as ApplicationStatus },
          orderBy: { position: "asc" },
        });
        if (targetCol) data.boardColumnId = targetCol.id;
      }

      const statusChanged = data.status && data.status !== current.status;

      // Conditional write — must include the observed status so a concurrent
      // status change loses deterministically instead of silently overwriting.
      const updated = await tx.application.updateMany({
        where: { id, userId, status: current.status },
        data,
      });

      if (updated.count !== 1) return { ok: false as const, reason: "conflict" };

      if (statusChanged) {
        // Use data.status (not parsed.status) — status may have been derived
        // from a boardColumnId change rather than an explicit status field
        // on the request body.
        await tx.applicationStatusEvent.create({
          data: {
            userId,
            applicationId: id,
            fromStatus: current.status,
            toStatus: data.status as ApplicationStatus,
          },
        });
      }

      return { ok: true as const };
    });

    if (!result.ok) {
      if (result.reason === "invalid_column") {
        return NextResponse.json({ error: "Invalid board column" }, { status: 400 });
      }
      if (result.reason === "conflict") {
        return NextResponse.json(
          { error: "Application was modified by another request. Please refresh and try again." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.application.findFirst({
      where: { id, userId },
      include: { resume: true },
    });

    const item = updated
      ? {
          ...updated,
          resume:
            updated.resume && updated.resume.userId === userId
              ? updated.resume
              : null,
        }
      : null;

    return NextResponse.json({ item });
  } catch (err: unknown) {
    return NextResponse.json({ error: formatError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const userId = await getUserIdOrNull();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const result = await prisma.application.deleteMany({
    where: { id, userId },
  });

  if (result.count !== 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
