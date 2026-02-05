import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IdSchema = z.string().min(1);

const PatchSchema = z.object({
  company: z.string().min(1).max(120).optional(),
  roleTitle: z.string().min(1).max(160).optional(),
  jobUrl: z.url().optional().or(z.literal("")).optional(),
  location: z.string().max(120).optional().or(z.literal("")).optional(),
  status: z
    .enum(["APPLIED", "SCREEN", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"])
    .optional(),
  appliedAt: z.iso.datetime().optional(),
  resumeId: z.string().optional().or(z.literal("")).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    const body = await req.json();
    const parsed = PatchSchema.parse(body);

    // If nothing to update, return early with a valid response
    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Read existing status once (for event creation)
    const existing = await prisma.application.findUnique({
      where: { id: appId },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.application.update({
        where: { id: appId },
        data: {
          ...(parsed.company !== undefined ? { company: parsed.company.trim() } : {}),
          ...(parsed.roleTitle !== undefined ? { roleTitle: parsed.roleTitle.trim() } : {}),
          ...(parsed.jobUrl !== undefined ? { jobUrl: parsed.jobUrl ? parsed.jobUrl : null } : {}),
          ...(parsed.location !== undefined ? { location: parsed.location ? parsed.location : null } : {}),
          ...(parsed.resumeId !== undefined ? { resumeId: parsed.resumeId ? parsed.resumeId : null } : {}),
          ...(parsed.appliedAt !== undefined ? { appliedAt: new Date(parsed.appliedAt) } : {}),
          ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        },
      });

      if (parsed.status !== undefined && existing.status !== parsed.status) {
        await tx.applicationStatusEvent.create({
          data: {
            applicationId: appId,
            fromStatus: existing.status,
            toStatus: parsed.status,
          },
        });
      }

      return next;
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    // Always return JSON so the client can parse it
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    await prisma.application.delete({ where: { id: appId } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
