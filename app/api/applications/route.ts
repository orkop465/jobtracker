import { NextResponse } from "next/server";
import type { ApplicationStatus } from "@prisma/client";
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

const StatusEnum = z.enum([
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
]);

const SourceEnum = z.enum([
  "LINKEDIN",
  "INDEED",
  "GLASSDOOR",
  "COMPANY_WEBSITE",
  "REFERRAL",
  "RECRUITER_OUTREACH",
  "JOB_BOARD",
  "CAREER_FAIR",
  "OTHER",
]);

const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

const CreateApplicationSchema = z
  .object({
    company: z.string().min(1, "is required").max(120, "is too long"),
    roleTitle: z.string().min(1, "is required").max(160, "is too long"),
    jobUrl: z
      .string()
      .url("must be a full URL like https://example.com")
      .optional()
      .or(z.literal("")),
    location: z.string().max(120, "is too long").optional().or(z.literal("")),
    status: StatusEnum.optional(),
    appliedAt: z.string().datetime("must be a valid date").optional(),
    resumeId: z.string().optional().or(z.literal("")),
    salaryMin: z
      .number()
      .int("must be a whole number")
      .min(0, "cannot be negative")
      .optional(),
    salaryMax: z
      .number()
      .int("must be a whole number")
      .min(0, "cannot be negative")
      .optional(),
    currency: z.string().max(3, "must be a 3-letter code").optional(),
    contactName: z.string().max(120, "is too long").optional().or(z.literal("")),
    contactEmail: z
      .string()
      .email("must be a valid email")
      .optional()
      .or(z.literal("")),
    contactLinkedIn: z.string().max(500, "is too long").optional().or(z.literal("")),
    notes: z
      .string()
      .max(10000, "exceeds 10,000 characters")
      .optional()
      .or(z.literal("")),
    source: SourceEnum.optional(),
    jobDescription: z
      .string()
      .max(50000, "exceeds 50,000 characters")
      .optional()
      .or(z.literal("")),
    priority: PriorityEnum.optional(),
    nextFollowUp: z
      .string()
      .datetime("must be a valid date")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (d) => !(d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax),
    { message: "must not exceed Max salary", path: ["salaryMin"] },
  );

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cap at 500 most recent applications. The UI exposes search/filter on top
  // of this list, so 500 covers any realistic personal job-search history.
  // If a user ever exceeds this, the route should be upgraded to cursor-based
  // pagination — for now we surface a `truncated` flag so the UI can warn.
  const LIST_CAP = 500;
  const apps = await prisma.application.findMany({
    where: { userId },
    include: {
      resume: true,
    },
    orderBy: { appliedAt: "desc" },
    take: LIST_CAP,
  });

  const items = apps.map((app) => ({
    ...app,
    // Defense-in-depth: never return a resume if ownership is inconsistent.
    resume:
      app.resume && app.resume.userId === userId
        ? app.resume
        : null,
  }));

  return NextResponse.json({
    items,
    truncated: items.length === LIST_CAP,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateApplicationSchema.parse(body);
    let resumeIdToSet: string | null = null;

    if (typeof parsed.resumeId === "string") {
      const trimmed = parsed.resumeId.trim();
      if (trimmed) {
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

    const created = await prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          userId,
          company: parsed.company.trim(),
          roleTitle: parsed.roleTitle.trim(),
          jobUrl: parsed.jobUrl || null,
          location: parsed.location || null,
          status: parsed.status ?? "APPLIED",
          appliedAt: parsed.appliedAt ? new Date(parsed.appliedAt) : new Date(),
          resumeId: resumeIdToSet,
          salaryMin: parsed.salaryMin ?? null,
          salaryMax: parsed.salaryMax ?? null,
          currency: parsed.currency || null,
          contactName: parsed.contactName?.trim() || null,
          contactEmail: parsed.contactEmail?.trim() || null,
          contactLinkedIn: parsed.contactLinkedIn?.trim() || null,
          notes: parsed.notes?.trim() || null,
          source: parsed.source ?? null,
          jobDescription: parsed.jobDescription?.trim() || null,
          priority: parsed.priority ?? undefined,
          nextFollowUp: parsed.nextFollowUp ? new Date(parsed.nextFollowUp) : null,
        },
      });

      // Auto-assign to the column matching the status, or fall back to first column
      const targetStatus = parsed.status ?? "APPLIED";
      const col = await tx.boardColumn.findFirst({
        where: { userId, mappedStatus: targetStatus as ApplicationStatus },
      }) ?? await tx.boardColumn.findFirst({
        where: { userId },
        orderBy: { position: "asc" },
      });

      if (col) {
        await tx.application.update({
          where: { id: app.id },
          data: { boardColumnId: col.id },
        });
        return { ...app, boardColumnId: col.id };
      }

      return app;
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: unknown) {
    // Keep errors consistent and JSON-parse-safe on the client.
    return NextResponse.json({ error: formatError(err) }, { status: 400 });
  }
}
