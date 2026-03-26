import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  const terminalStatuses = ["REJECTED", "WITHDRAWN", "GHOSTED"] as const;

  const [
    totalApps,
    statusCounts,
    recentEvents,
    staleApps,
    overdueFollowUps,
    recentApps,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }),

    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),

    prisma.applicationStatusEvent.findMany({
      where: { userId, voidedAt: null },
      orderBy: { occurredAt: "desc" },
      take: 10,
      include: {
        application: { select: { company: true, roleTitle: true } },
      },
    }),

    prisma.application.findMany({
      where: {
        userId,
        status: { notIn: [...terminalStatuses, "OFFER"] },
        updatedAt: { lt: fourteenDaysAgo },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: { id: true, company: true, roleTitle: true, status: true, updatedAt: true },
    }),

    prisma.application.findMany({
      where: {
        userId,
        nextFollowUp: { lt: now },
        status: { notIn: [...terminalStatuses] },
      },
      orderBy: { nextFollowUp: "asc" },
      take: 10,
      select: { id: true, company: true, roleTitle: true, nextFollowUp: true, status: true },
    }),

    prisma.application.findMany({
      where: { userId, appliedAt: { gte: eightWeeksAgo } },
      select: { appliedAt: true },
    }),
  ]);

  // Compute stats
  const terminalCount = statusCounts
    .filter((g) => (terminalStatuses as readonly string[]).includes(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const offerCount = statusCounts.find((g) => g.status === "OFFER")?._count._all ?? 0;
  const activePipeline = totalApps - terminalCount;

  // Response rate: anything beyond APPLIED
  const appliedOnlyCount = statusCounts.find((g) => g.status === "APPLIED")?._count._all ?? 0;
  const respondedCount = totalApps - appliedOnlyCount - statusCounts
    .filter((g) => (["GHOSTED"] as string[]).includes(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);
  const responseRate = totalApps > 0 ? respondedCount / totalApps : 0;

  // Weekly velocity
  const velocity: { weekLabel: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count = recentApps.filter(
      (a) => new Date(a.appliedAt) >= weekStart && new Date(a.appliedAt) < weekEnd
    ).length;
    const label = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    velocity.push({ weekLabel: label, count });
  }

  return NextResponse.json({
    stats: {
      totalApplications: totalApps,
      responseRate: Math.round(responseRate * 100),
      offerCount,
      activePipeline,
    },
    needsAttention: {
      staleApps: staleApps.map((a) => ({
        ...a,
        statusLabel: statusLabel(a.status),
        daysSinceUpdate: Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      overdueFollowUps: overdueFollowUps.map((a) => ({
        ...a,
        statusLabel: statusLabel(a.status),
      })),
    },
    recentActivity: recentEvents.map((ev) => ({
      id: ev.id,
      company: ev.application.company,
      roleTitle: ev.application.roleTitle,
      fromStatus: statusLabel(ev.fromStatus),
      toStatus: statusLabel(ev.toStatus),
      occurredAt: ev.occurredAt,
    })),
    velocity,
  });
}
