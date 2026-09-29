import { useMemo, useState } from "react";
import { buildMonthGrid, summarizeMonth, entryMap, workoutBreakdown } from "../utils/stats.js";
import { formatLongDate, formatMinutes, monthLabel } from "../utils/date.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIRST_YEAR = 2026;

export default function CalendarPanel({ user, today, onDayClick }) {
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth - 1 });
  const entries = useMemo(() => entryMap(user.entries), [user]);
  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const summary = summarizeMonth(user.entries, cursor.year, cursor.month);
  const monthEntries = user.entries.filter((entry) =>
    entry.dateKey.startsWith(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-`)
  );
  const breakdown = workoutBreakdown(monthEntries, 3);

  const isCurrent = cursor.year === todayYear && cursor.month === todayMonth - 1;
  const atStart = cursor.year === FIRST_YEAR && cursor.month === 0;

  const move = (delta) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const daysElapsed = isCurrent ? Number(today.slice(8, 10)) : new Date(cursor.year, cursor.month + 1, 0).getDate();
  const rate = daysElapsed ? Math.round((summary.days / daysElapsed) * 100) : 0;

  return (
    <section className="tab-panel" role="tabpanel" aria-label="Calendar">
      <section className="panel calendar">
        <div className="panel-head panel-head--wrap">
          <div>
            <h2>
              {user.name}'s calendar
            </h2>
            <p className="muted">Tap any past day to log or edit a workout.</p>
          </div>
          <div className="month-nav">
            <button type="button" className="icon-button" onClick={() => move(-1)} disabled={atStart} aria-label="Previous month">
              ‹
            </button>
            <strong>
              {monthLabel(cursor.year, cursor.month)} {cursor.year}
            </strong>
            <button type="button" className="icon-button" onClick={() => move(1)} disabled={isCurrent} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        <div className="month-summary">
          <div className="stat-tile stat-tile--compact">
            <span className="stat-tile__label">Days</span>
            <span className="stat-tile__value">{summary.days}<small>/ {daysElapsed}</small></span>
          </div>
          <div className="stat-tile stat-tile--compact">
            <span className="stat-tile__label">Time</span>
            <span className="stat-tile__value">{formatMinutes(summary.minutes)}</span>
          </div>
          <div className="stat-tile stat-tile--compact">
            <span className="stat-tile__label">Hit rate</span>
            <span className="stat-tile__value">{rate}<small>%</small></span>
          </div>
          {breakdown.length ? (
            <div className="stat-tile stat-tile--compact stat-tile--wide">
              <span className="stat-tile__label">Top workouts</span>
              <span className="chips">
                {breakdown.map((item) => (
                  <span className="chip" key={item.label}>
                    {item.label} <b>{item.count}</b>
                  </span>
                ))}
              </span>
            </div>
          ) : null}
        </div>

        <div className="weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="month-grid">
          {cells.map((cell, index) => {
            if (!cell) return <div key={`empty-${index}`} className="day is-empty" />;
            const entry = entries.get(cell.dateKey);
            const isToday = cell.dateKey === today;
            const isFuture = cell.dateKey > today;
            const missed = !entry && !isFuture && !isToday;
            const label = entry
              ? `${entry.workout}, ${entry.duration}`
              : isFuture
                ? "Upcoming"
                : isToday
                  ? "Not logged yet"
                  : "No workout logged";
            return (
              <button
                key={cell.dateKey}
                type="button"
                className={`day ${entry ? "is-done" : ""} ${missed ? "is-missed" : ""} ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}`}
                disabled={isFuture}
                onClick={() => onDayClick(cell.dateKey)}
                aria-label={`${formatLongDate(cell.date)}: ${label}`}
                title={label}
              >
                <span className="day__num">{cell.date.getDate()}</span>
                <span className="day__icon" aria-hidden="true">
                  {entry ? "✓" : isToday ? "•" : missed ? "✕" : ""}
                </span>
                <span className="day__meta">{entry ? entry.duration : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i className="legend__dot is-done" /> Done</span>
          <span><i className="legend__dot is-missed" /> Missed</span>
          <span><i className="legend__dot is-today" /> Today</span>
        </div>
      </section>
    </section>
  );
}
