import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const weekStart = getWeekStart(now);

  const terminalStatuses = ["REJECTED", "WITHDRAWN", "GHOSTED"] as const;
  const interviewStatuses = [
    "RECRUITER_SCREEN", "INTERVIEW_ROUND_1", "INTERVIEW_ROUND_2", "INTERVIEW_ROUND_3",
  ] as const;

  const [
    totalApps,
    statusCounts,
    recentEvents,
    stalledApps,
    followUps,
    upcomingInterviews,
    user,
    thisWeekApps,
    recentApps,
    recentAddedApps,
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
      take: 20,
      include: {
        application: { select: { company: true, roleTitle: true } },
      },
    }),

    prisma.application.findMany({
      where: {
        userId,
        status: { notIn: [...terminalStatuses, "OFFER"] },
        updatedAt: { lt: tenDaysAgo },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: { id: true, company: true, roleTitle: true, status: true, updatedAt: true },
    }),

    prisma.followUp.findMany({
      where: { userId, done: false },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        application: { select: { id: true, company: true, roleTitle: true } },
      },
    }),

    prisma.interview.findMany({
      where: {
        userId,
        completed: false,
        scheduledAt: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      include: {
        application: { select: { id: true, company: true, roleTitle: true } },
      },
    }),

    prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyGoal: true, name: true },
    }),

    prisma.application.count({
      where: { userId, appliedAt: { gte: weekStart } },
    }),

    prisma.application.findMany({
      where: { userId, appliedAt: { gte: twelveWeeksAgo } },
      select: { appliedAt: true, status: true },
    }),

    prisma.application.findMany({
      where: { userId, createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, company: true, roleTitle: true, createdAt: true },
    }),
  ]);

  // Stats
  const terminalCount = statusCounts
    .filter((g) => (terminalStatuses as readonly string[]).includes(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  const offerCount = statusCounts.find((g) => g.status === "OFFER")?._count._all ?? 0;
  const activePipeline = totalApps - terminalCount;

  const appliedOnlyCount = statusCounts.find((g) => g.status === "APPLIED")?._count._all ?? 0;
  const ghostedCount = statusCounts
    .filter((g) => g.status === "GHOSTED")
    .reduce((sum, g) => sum + g._count._all, 0);
  const respondedCount = totalApps - appliedOnlyCount - ghostedCount;
  const responseRate = totalApps > 0 ? Math.round((respondedCount / totalApps) * 100) : 0;

  const onsiteCount = statusCounts
    .filter((g) => (interviewStatuses as readonly string[]).includes(g.status))
    .reduce((sum, g) => sum + g._count._all, 0);

  // 12-week velocity (for sparklines)
  const velocity: { weekLabel: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count = recentApps.filter(
      (a) => new Date(a.appliedAt) >= wStart && new Date(a.appliedAt) < wEnd
    ).length;
    const label = wEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    velocity.push({ weekLabel: label, count });
  }

  // Monthly activity (4 weeks: applied vs responded)
  const monthlyActivity: { weekLabel: string; applied: number; responded: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekApps = recentApps.filter(
      (a) => new Date(a.appliedAt) >= wStart && new Date(a.appliedAt) < wEnd
    );
    const applied = weekApps.length;
    const responded = weekApps.filter((a) => a.status !== "APPLIED" && a.status !== "GHOSTED").length;
    monthlyActivity.push({ weekLabel: `W${4 - i}`, applied, responded });
  }

  // Follow-ups with urgency classification
  const classifiedFollowUps = followUps.map((f) => {
    const dueTime = new Date(f.dueDate).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const threeDays = todayEnd + 3 * 24 * 60 * 60 * 1000;

    let urgency: string;
    if (dueTime < todayStart) urgency = "overdue";
    else if (dueTime <= todayEnd) urgency = "today";
    else if (dueTime <= threeDays) urgency = "soon";
    else urgency = "later";

    return {
      id: f.id,
      title: f.title,
      dueDate: f.dueDate,
      done: f.done,
      urgency,
      applicationId: f.applicationId,
      company: f.application.company,
      roleTitle: f.application.roleTitle,
    };
  });

  // Interviews grouped by day
  const interviewsByDay = upcomingInterviews.map((iv) => ({
    id: iv.id,
    title: iv.title,
    scheduledAt: iv.scheduledAt,
    type: iv.type,
    durationMin: iv.durationMin,
    location: iv.location,
    applicationId: iv.applicationId,
    company: iv.application.company,
    roleTitle: iv.application.roleTitle,
  }));

  // Stalled apps
  const classifiedStalled = stalledApps.map((a) => ({
    id: a.id,
    company: a.company,
    roleTitle: a.roleTitle,
    status: a.status,
    statusLabel: statusLabel(a.status),
    daysSinceUpdate: Math.floor((now.getTime() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Activity feed: combine status events + added apps
  const feed = [
    ...recentEvents.map((ev) => ({
      id: ev.id,
      kind: "move" as const,
      company: ev.application.company,
      roleTitle: ev.application.roleTitle,
      fromStatus: statusLabel(ev.fromStatus),
      toStatus: statusLabel(ev.toStatus),
      occurredAt: ev.occurredAt,
      text: `${ev.application.company} — ${ev.application.roleTitle} moved to ${statusLabel(ev.toStatus)}`,
    })),
    ...recentAddedApps.map((a) => ({
      id: a.id,
      kind: "add" as const,
      company: a.company,
      roleTitle: a.roleTitle,
      fromStatus: null,
      toStatus: null,
      occurredAt: a.createdAt,
      text: `Added ${a.company} — ${a.roleTitle} to pipeline`,
    })),
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 20);

  // Generate insight
  const insight = generateInsight({
    responseRate, stalledCount: stalledApps.length, velocity, totalApps,
  });

  return NextResponse.json({
    userName: user?.name || null,
    stats: {
      responseRate,
      inFlight: activePipeline,
      onsites: onsiteCount,
      offersPending: offerCount,
      totalApplications: totalApps,
    },
    followUps: classifiedFollowUps,
    interviews: interviewsByDay,
    stalledApps: classifiedStalled,
    recentActivity: feed,
    velocity,
    monthlyActivity,
    weeklyGoal: user?.weeklyGoal ?? null,
    thisWeekApplied: thisWeekApps,
    insight,
  });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateInsight(data: {
  responseRate: number;
  stalledCount: number;
  velocity: { count: number }[];
  totalApps: number;
}): { type: string; message: string; cta?: string } | null {
  const recentVelocity = data.velocity.slice(-4);
  const avgRecent = recentVelocity.reduce((s, v) => s + v.count, 0) / 4;
  const avgPrior = data.velocity.slice(0, 8).reduce((s, v) => s + v.count, 0) / 8;

  if (data.stalledCount >= 4) {
    return {
      type: "stalled",
      message: `You have ${data.stalledCount} applications stalled for 10+ days. A quick follow-up now could reactivate them.`,
      cta: "View stalled",
    };
  }

  if (data.responseRate < 20 && data.totalApps > 5) {
    return {
      type: "response",
      message: `Your response rate is ${data.responseRate}%. Consider tailoring resumes per role or diversifying application sources.`,
      cta: "See analytics",
    };
  }

  if (avgPrior > 0 && avgRecent < avgPrior * 0.6) {
    return {
      type: "velocity",
      message: `Your application pace has dropped ${Math.round((1 - avgRecent / avgPrior) * 100)}% recently. Setting a weekly goal could help maintain momentum.`,
      cta: "Set a goal",
    };
  }

  if (data.responseRate >= 40) {
    return {
      type: "positive",
      message: `Your ${data.responseRate}% response rate is strong. Keep refining your approach — the data says it's working.`,
    };
  }

  return null;
}
