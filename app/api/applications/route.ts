import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";

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
    company: z.string().min(1).max(120),
    roleTitle: z.string().min(1).max(160),
    jobUrl: z.string().url().optional().or(z.literal("")),
    location: z.string().max(120).optional().or(z.literal("")),
    status: StatusEnum.optional(),
    appliedAt: z.string().datetime().optional(),
    resumeId: z.string().optional().or(z.literal("")),
    salaryMin: z.number().int().min(0).optional(),
    salaryMax: z.number().int().min(0).optional(),
    currency: z.string().max(3).optional(),
    contactName: z.string().max(120).optional().or(z.literal("")),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactLinkedIn: z.string().max(500).optional().or(z.literal("")),
    notes: z.string().max(10000).optional().or(z.literal("")),
    source: SourceEnum.optional(),
    jobDescription: z.string().max(50000).optional().or(z.literal("")),
    priority: PriorityEnum.optional(),
    nextFollowUp: z.string().datetime().optional().or(z.literal("")),
  })
  .refine(
    (d) => !(d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax),
    { message: "salaryMin must not exceed salaryMax", path: ["salaryMin"] }
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

    const created = await prisma.application.create({
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

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: any) {
    // Keep errors consistent and JSON-parse-safe on the client.
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
