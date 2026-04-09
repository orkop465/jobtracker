import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import {
  statusLabel,
  sourceLabel,
  isScreenStatus,
  isInterviewStatus,
  isOfferStatus,
  isTerminalStatus,
  maxStageRank,
} from "@/lib/constants";

type SankeyNode = { id: string; label: string };
type SankeyLink = { source: string; target: string; value: number };

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  // Rolling 12-month analytics window. This bounds the work the route does
  // for power users with thousands of historical applications and keeps
  // the response size predictable. groupBy counts (status totals) are still
  // computed across the full lifetime since they're already aggregated in SQL.
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [applications, events, groupedByStatus, resumes] = await Promise.all([
    prisma.application.findMany({
      where: { userId, appliedAt: { gte: twelveMonthsAgo } },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        source: true,
        resumeId: true,
      },
    }),
    prisma.applicationStatusEvent.findMany({
      where: {
        userId,
        voidedAt: null,
        occurredAt: { gte: twelveMonthsAgo },
      },
      orderBy: { occurredAt: "asc" },
      select: {
        applicationId: true,
        fromStatus: true,
        toStatus: true,
        occurredAt: true,
      },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.resume.findMany({
      where: { userId },
      select: { id: true, label: true },
    }),
  ]);

  const appCount = applications.length;
  const resumeMap = new Map(resumes.map((r) => [r.id, r.label]));

  const byApp = new Map<string, Array<(typeof events)[number]>>();
  for (const ev of events) {
    const arr = byApp.get(ev.applicationId) ?? [];
    arr.push(ev);
    byApp.set(ev.applicationId, arr);
  }

  let respondedCount = 0;
  let reachedScreen = 0;
  let reachedInterview = 0;
  let reachedOffer = 0;
  let terminalOutcomes = 0;

  const timeBuckets = new Map<ApplicationStatus, { totalMs: number; count: number }>();
  const linkCounts = new Map<string, number>();
  const nodeSet = new Set<string>();

  // Per-app tracking for source/resume stats
  const appMaxRanks = new Map<string, number>();
  const appResponded = new Map<string, boolean>();

  // Time-to-outcome
  const daysToOffer: number[] = [];
  const daysToRejection: number[] = [];

  for (const app of applications) {
    const appEvents = byApp.get(app.id) ?? [];
    let appRank = maxStageRank(app.status);
    let responded = isScreenStatus(app.status) || isInterviewStatus(app.status) || isOfferStatus(app.status);

    if (isTerminalStatus(app.status)) terminalOutcomes += 1;

    if (appEvents.length > 0) {
      const first = appEvents[0];
      const appliedDurationMs =
        first.occurredAt.getTime() - new Date(app.appliedAt).getTime();
      if (appliedDurationMs >= 0) {
        const cur = timeBuckets.get("APPLIED") ?? { totalMs: 0, count: 0 };
        cur.totalMs += appliedDurationMs;
        cur.count += 1;
        timeBuckets.set("APPLIED", cur);
      }
    }

    for (let i = 0; i < appEvents.length; i += 1) {
      const ev = appEvents[i];
      nodeSet.add(ev.fromStatus);
      nodeSet.add(ev.toStatus);

      const linkKey = `${ev.fromStatus}=>${ev.toStatus}`;
      linkCounts.set(linkKey, (linkCounts.get(linkKey) ?? 0) + 1);

      const rank = maxStageRank(ev.toStatus);
      if (rank > appRank) appRank = rank;

      if (isScreenStatus(ev.toStatus) || isInterviewStatus(ev.toStatus) || isOfferStatus(ev.toStatus)) {
        responded = true;
      }

      if (i < appEvents.length - 1) {
        const next = appEvents[i + 1];
        const ms = next.occurredAt.getTime() - ev.occurredAt.getTime();
        if (ms >= 0) {
          const cur = timeBuckets.get(ev.toStatus) ?? { totalMs: 0, count: 0 };
          cur.totalMs += ms;
          cur.count += 1;
          timeBuckets.set(ev.toStatus, cur);
        }
      }
    }

    if (responded) respondedCount += 1;
    if (appRank >= 2) reachedScreen += 1;
    if (appRank >= 3) reachedInterview += 1;
    if (appRank >= 4) reachedOffer += 1;

    appMaxRanks.set(app.id, appRank);
    appResponded.set(app.id, responded);

    // Time to outcome
    if (app.status === "OFFER" && appEvents.length > 0) {
      const lastEvent = appEvents[appEvents.length - 1];
      const days = (lastEvent.occurredAt.getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0) daysToOffer.push(days);
    }
    if (app.status === "REJECTED" && appEvents.length > 0) {
      const lastEvent = appEvents[appEvents.length - 1];
      const days = (lastEvent.occurredAt.getTime() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0) daysToRejection.push(days);
    }
  }

  const responseRate = appCount > 0 ? respondedCount / appCount : 0;

  const pipelineCounts = Object.fromEntries(
    groupedByStatus.map((g) => [g.status, g._count._all])
  );

  const nodes: SankeyNode[] = Array.from(nodeSet).map((s) => ({ id: s, label: statusLabel(s) }));
  const links: SankeyLink[] = Array.from(linkCounts.entries()).map(([k, value]) => {
    const [source, target] = k.split("=>");
    return { source, target, value };
  });
  const sankeymaticText = links
    .filter((l) => l.value > 0)
    .map((l) => `${statusLabel(l.source)} [${l.value}] ${statusLabel(l.target)}`)
    .join("\n");
  const googleChartRows = links
    .filter((l) => l.value > 0)
    .map((l) => [statusLabel(l.source), statusLabel(l.target), l.value] as [string, string, number]);

  const timeInStage = Object.fromEntries(
    Array.from(timeBuckets.entries()).map(([status, bucket]) => [
      statusLabel(status),
      {
        avgHours: bucket.count > 0 ? bucket.totalMs / bucket.count / (1000 * 60 * 60) : 0,
        samples: bucket.count,
      },
    ])
  );

  const pipelineCountsLabeled = Object.fromEntries(
    groupedByStatus.map((g) => [statusLabel(g.status), g._count._all])
  );

  // --- NEW: Source effectiveness ---
  const sourceGroups = new Map<string, { total: number; responded: number; interviewed: number; offered: number }>();
  for (const app of applications) {
    const src = app.source ?? "UNKNOWN";
    const group = sourceGroups.get(src) ?? { total: 0, responded: 0, interviewed: 0, offered: 0 };
    group.total += 1;
    const rank = appMaxRanks.get(app.id) ?? 1;
    if (appResponded.get(app.id)) group.responded += 1;
    if (rank >= 3) group.interviewed += 1;
    if (rank >= 4) group.offered += 1;
    sourceGroups.set(src, group);
  }

  const sourceStats = Object.fromEntries(
    Array.from(sourceGroups.entries())
      .filter(([, g]) => g.total > 0)
      .map(([src, g]) => [
        src === "UNKNOWN" ? "Unknown" : sourceLabel(src),
        {
          total: g.total,
          responded: g.responded,
          interviewed: g.interviewed,
          offered: g.offered,
          responseRate: g.total > 0 ? g.responded / g.total : 0,
        },
      ])
  );

  // --- NEW: Resume performance ---
  const resumeGroups = new Map<string, { total: number; responded: number }>();
  for (const app of applications) {
    if (!app.resumeId) continue;
    const group = resumeGroups.get(app.resumeId) ?? { total: 0, responded: 0 };
    group.total += 1;
    if (appResponded.get(app.id)) group.responded += 1;
    resumeGroups.set(app.resumeId, group);
  }

  const resumeStats = Array.from(resumeGroups.entries())
    .map(([resumeId, g]) => ({
      resumeId,
      resumeLabel: resumeMap.get(resumeId) ?? "Unknown",
      total: g.total,
      responded: g.responded,
      responseRate: g.total > 0 ? g.responded / g.total : 0,
    }))
    .sort((a, b) => b.responseRate - a.responseRate);

  // --- NEW: Application velocity (12 weeks) ---
  const velocity: { weekLabel: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count = applications.filter(
      (a) => new Date(a.appliedAt) >= weekStart && new Date(a.appliedAt) < weekEnd
    ).length;
    const label = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    velocity.push({ weekLabel: label, count });
  }

  // --- NEW: Conversion rates ---
  const conversionRates = [
    { from: "Applied", to: "Screen", numerator: reachedScreen, denominator: appCount },
    { from: "Screen", to: "Interview", numerator: reachedInterview, denominator: reachedScreen },
    { from: "Interview", to: "Offer", numerator: reachedOffer, denominator: reachedInterview },
  ]
    .filter((c) => c.denominator > 0)
    .map((c) => ({
      ...c,
      rate: c.numerator / c.denominator,
    }));

  // --- NEW: Time to outcome ---
  function median(arr: number[]) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function avg(arr: number[]) {
    if (arr.length === 0) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  const timeToOutcome = {
    avgDaysToOffer: avg(daysToOffer) != null ? Math.round(avg(daysToOffer)!) : null,
    avgDaysToRejection: avg(daysToRejection) != null ? Math.round(avg(daysToRejection)!) : null,
    medianDaysToOffer: median(daysToOffer) != null ? Math.round(median(daysToOffer)!) : null,
    medianDaysToRejection: median(daysToRejection) != null ? Math.round(median(daysToRejection)!) : null,
    offerSamples: daysToOffer.length,
    rejectionSamples: daysToRejection.length,
  };

  return NextResponse.json({
    summary: {
      totalApplications: appCount,
      respondedApplications: respondedCount,
      responseRate,
    },
    funnel: {
      applied: appCount,
      screen: reachedScreen,
      interview: reachedInterview,
      offer: reachedOffer,
      terminalOutcomes,
    },
    pipelineCounts,
    pipelineCountsLabeled,
    timeInStage,
    sankey: { nodes, links, sankeymaticText, googleChartRows },
    sourceStats,
    resumeStats,
    velocity,
    conversionRates,
    timeToOutcome,
  });
}
