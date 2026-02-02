import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateApplicationSchema = z.object({
  company: z.string().min(1).max(120),
  roleTitle: z.string().min(1).max(160),
  jobUrl: z.url().optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  status: z
    .enum(["APPLIED", "SCREEN", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"])
    .optional(),
  appliedAt: z.iso.datetime().optional(),
});

export async function GET() {
  const apps = await prisma.application.findMany({
    include: {
        resume: true,
    },
    orderBy: { appliedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ items: apps });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateApplicationSchema.parse(body);

    const created = await prisma.application.create({
      data: {
        company: parsed.company.trim(),
        roleTitle: parsed.roleTitle.trim(),
        jobUrl: parsed.jobUrl ? parsed.jobUrl : null,
        location: parsed.location ? parsed.location : null,
        status: parsed.status ?? "APPLIED",
        appliedAt: parsed.appliedAt ? new Date(parsed.appliedAt) : new Date(),
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
