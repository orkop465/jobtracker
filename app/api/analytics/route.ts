import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

type SankeyNode = { id: string; label: string };
type SankeyLink = { source: string; target: string; value: number };

function isScreenStatus(status: ApplicationStatus) {
  return status === "RECRUITER_SCREEN" || status === "OA";
}

function isInterviewStatus(status: ApplicationStatus) {
  return (
    status === "INTERVIEW_ROUND_1" ||
    status === "INTERVIEW_ROUND_2" ||
    status === "INTERVIEW_ROUND_3"
  );
}

function isOfferStatus(status: ApplicationStatus) {
  return status === "OFFER";
}

function isTerminalStatus(status: ApplicationStatus) {
  return status === "REJECTED" || status === "WITHDRAWN" || status === "GHOSTED";
}

function maxStageRank(status: ApplicationStatus) {
  if (isOfferStatus(status)) return 4;
  if (isInterviewStatus(status)) return 3;
  if (isScreenStatus(status)) return 2;
  return 1;
}

function statusLabel(status: string) {
  switch (status) {
    case "APPLIED":
      return "Applied";
    case "RECRUITER_SCREEN":
      return "Recruiter Screen";
    case "OA":
      return "OA";
    case "INTERVIEW_ROUND_1":
      return "Round 1";
    case "INTERVIEW_ROUND_2":
      return "Round 2";
    case "INTERVIEW_ROUND_3":
      return "Final Round";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
    case "WITHDRAWN":
      return "Withdrawn";
    case "GHOSTED":
      return "Ghosted";
    default:
      return status;
  }
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [applications, events, groupedByStatus] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      select: { id: true, status: true, appliedAt: true },
    }),
    prisma.applicationStatusEvent.findMany({
      where: { userId, voidedAt: null },
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
  ]);

  const appCount = applications.length;

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

  for (const app of applications) {
    const appEvents = byApp.get(app.id) ?? [];
    let appMaxRank = maxStageRank(app.status);
    let appResponded = isScreenStatus(app.status) || isInterviewStatus(app.status) || isOfferStatus(app.status);

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
      if (rank > appMaxRank) appMaxRank = rank;

      if (isScreenStatus(ev.toStatus) || isInterviewStatus(ev.toStatus) || isOfferStatus(ev.toStatus)) {
        appResponded = true;
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

    if (appResponded) respondedCount += 1;
    if (appMaxRank >= 2) reachedScreen += 1;
    if (appMaxRank >= 3) reachedInterview += 1;
    if (appMaxRank >= 4) reachedOffer += 1;
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
  });
}
