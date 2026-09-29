import { formatLongDate, parseDateKey, formatMinutes, durationToMinutes } from "../utils/date.js";
import { computeStreaks } from "../utils/stats.js";

export default function TodayCard({ users, user, today, onLog }) {
  const entry = user.entries.find((item) => item.dateKey === today);
  const { current } = computeStreaks(user.entries, today);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const others = users.filter((item) => item.name !== user.name);

  return (
    <section className={`panel today-card ${entry ? "is-done" : ""}`}>
      <div className="today-card__head">
        <div>
          <p className="eyebrow">{formatLongDate(parseDateKey(today))}</p>
          <h2>
            {greeting}, {user.name}
          </h2>
        </div>
        <div className={`streak-pill ${current ? "is-hot" : ""}`} title="Current streak">
          <span aria-hidden="true">🔥</span>
          <strong>{current}</strong>
          <span>day{current === 1 ? "" : "s"}</span>
        </div>
      </div>

      {entry ? (
        <div className="today-card__body">
          <div className="today-entry">
            <span className="check" aria-hidden="true">✓</span>
            <div>
              <strong>{entry.workout}</strong>
              <p className="muted">
                {formatMinutes(durationToMinutes(entry.duration))} · {entry.intensity}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </p>
            </div>
          </div>
          <button className="ghost" type="button" onClick={() => onLog(today)}>
            Edit
          </button>
        </div>
      ) : (
        <div className="today-card__body">
          <p className="muted">
            Nothing logged yet today.{" "}
            {current ? `Keep the ${current}-day streak alive.` : "Start a new streak."}
          </p>
          <button className="cta cta--lg" type="button" onClick={() => onLog(today)}>
            Log today's workout
          </button>
        </div>
      )}

      {others.length ? (
        <div className="squad-status" aria-label="Squad status today">
          {others.map((other) => {
            const done = other.entries.some((item) => item.dateKey === today);
            return (
              <span key={other.name} className={`squad-status__item ${done ? "is-done" : ""}`}>
                <span className={`avatar avatar--xs ${other.color}`}>{other.initials}</span>
                {other.name} {done ? "checked in" : "not yet"}
              </span>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
