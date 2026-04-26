"use client";

interface PageHeaderProps {
  userName: string | null;
  followUpCount: number;
  interviewCount: number;
  timeRange: string;
  setTimeRange: (v: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function getDateInfo(): { dateStr: string; weekNum: number } {
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateStr = `${dayNames[now.getDay()]}, ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  const weekNum = Math.ceil(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return { dateStr, weekNum };
}

export function PageHeader({
  userName, followUpCount, interviewCount, timeRange, setTimeRange,
}: PageHeaderProps) {
  const { dateStr, weekNum } = getDateInfo();
  const greeting = getGreeting();
  const name = userName || "there";

  const nudges: string[] = [];
  if (followUpCount > 0) nudges.push(`${followUpCount} follow-up${followUpCount > 1 ? "s" : ""} due`);
  if (interviewCount > 0) nudges.push(`${interviewCount} interview${interviewCount > 1 ? "s" : ""} this week`);

  return (
    <div className="page-head">
      <div className="page-head-left">
        <div className="page-eyebrow" data-index="00">
          {dateStr} <span className="page-eyebrow-sep">&middot;</span> Week {weekNum}
        </div>
        <h1 className="page-title">
          {greeting}, {name} <span className="page-title-sep">&middot;</span> let&apos;s move forward.
        </h1>
        {nudges.length > 0 && (
          <p className="page-sub">
            You have{" "}
            {nudges.map((n, i) => (
              <span key={i}>
                {i > 0 && " and "}
                <span className="nudge">{n}</span>
              </span>
            ))}
            . Pipeline looks healthy.
          </p>
        )}
      </div>
      <div className="page-head-right">
        <div className="seg">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "This week" },
            { id: "all", label: "All time" },
          ].map((r) => (
            <button
              key={r.id}
              className={timeRange === r.id ? "is-active" : ""}
              onClick={() => setTimeRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
