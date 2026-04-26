"use client";

import type { InterviewItem } from "./types";

interface UpcomingCardProps {
  interviews: InterviewItem[];
  onSelect?: (applicationId: string) => void;
}

function getDaysOfWeek(): { day: string; date: number; fullDate: Date; isToday: boolean }[] {
  const now = new Date();
  const days: { day: string; date: number; fullDate: Date; isToday: boolean }[] = [];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      fullDate: d,
      isToday: i === 0,
    });
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function UpcomingCard({ interviews, onSelect }: UpcomingCardProps) {
  const days = getDaysOfWeek();

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <span className="card-index">[02]</span>
          <span className="card-title">Upcoming interviews</span>
          <span className="card-sub">&middot; next 7d</span>
        </div>
        <button className="card-action">Week view &rarr;</button>
      </div>

      <div className="rail">
        {days.slice(0, 4).map((d, i) => {
          const dayInterviews = interviews.filter((iv) => isSameDay(new Date(iv.scheduledAt), d.fullDate));
          const isEmpty = dayInterviews.length === 0;

          return (
            <div key={i} className={`rail-day ${d.isToday ? "is-today" : ""} ${isEmpty ? "is-empty" : ""}`}>
              <div className="rail-head"><span>{d.day}</span></div>
              <div className="rail-date">{d.date}</div>
              {isEmpty ? (
                <div className="rail-empty">&mdash;</div>
              ) : (
                dayInterviews.map((iv) => (
                  <div
                    key={iv.id}
                    className={`rail-event kind-${iv.type}`}
                    onClick={() => onSelect?.(iv.applicationId)}
                  >
                    <div className="rail-event-time">
                      {new Date(iv.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className="rail-event-title">{iv.company} &middot; {iv.title}</div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <div className="rail" style={{ marginTop: 8 }}>
        {days.slice(4).map((d, i) => {
          const dayInterviews = interviews.filter((iv) => isSameDay(new Date(iv.scheduledAt), d.fullDate));
          const isEmpty = dayInterviews.length === 0;

          return (
            <div key={i} className={`rail-day ${isEmpty ? "is-empty" : ""}`} style={{ minHeight: 80 }}>
              <div className="rail-head"><span>{d.day}</span></div>
              <div className="rail-date">{d.date}</div>
              {isEmpty ? (
                <div className="rail-empty">&mdash;</div>
              ) : (
                dayInterviews.map((iv) => (
                  <div
                    key={iv.id}
                    className={`rail-event kind-${iv.type}`}
                    onClick={() => onSelect?.(iv.applicationId)}
                  >
                    <div className="rail-event-time">
                      {new Date(iv.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                    <div className="rail-event-title">{iv.company} &middot; {iv.title}</div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
