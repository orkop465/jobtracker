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

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const appId = IdSchema.parse(id);

    const body = await _req.json();
    const parsed = PatchSchema.parse(body);

    const updated = await prisma.application.update({
      where: { id: appId },
      data: {
        ...(parsed.company !== undefined ? { company: parsed.company.trim() } : {}),
        ...(parsed.roleTitle !== undefined ? { roleTitle: parsed.roleTitle.trim() } : {}),
        ...(parsed.jobUrl !== undefined
          ? { jobUrl: parsed.jobUrl ? parsed.jobUrl : null }
          : {}),
        ...(parsed.location !== undefined
          ? { location: parsed.location ? parsed.location : null }
          : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.appliedAt !== undefined ? { appliedAt: new Date(parsed.appliedAt) } : {}),
        ...(parsed.resumeId !== undefined ? { resumeId: parsed.resumeId ? parsed.resumeId : null } : {}),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (err: any) {
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
