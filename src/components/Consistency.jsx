import { useMemo } from "react";
import { buildYearHeatmap, entryMap } from "../utils/stats.js";
import { monthLabel } from "../utils/date.js";

const dayLabel = (date) =>
  date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function Consistency({ users, activeUser, year, today, onSelectUser, onDayClick }) {
  const done = useMemo(() => entryMap(activeUser.entries), [activeUser]);
  const months = useMemo(() => buildYearHeatmap(year, new Set(done.keys())), [year, done]);

  return (
    <section className="panel">
      <div className="panel-head panel-head--wrap">
        <div>
          <h2>Consistency</h2>
          <p className="muted">
            {done.size} day{done.size === 1 ? "" : "s"} logged in {year}
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="Choose a squad member">
          {users.map((user) => (
            <button
              key={user.name}
              type="button"
              role="tab"
              aria-selected={user.name === activeUser.name}
              className={`seg__item ${user.name === activeUser.name ? "is-active" : ""}`}
              onClick={() => onSelectUser(user.name)}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>
      <div className="heatmap" role="img" aria-label={`Workout heatmap for ${activeUser.name} in ${year}`}>
        {months.map((month) => (
          <div className="heatmap__month" key={month.month}>
            <span className="heatmap__label">{monthLabel(year, month.month, "short")}</span>
            <div className="heatmap__weeks">
              {month.weeks.map((week, weekIndex) => (
                <div className="heatmap__week" key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    if (!day) return <span key={dayIndex} className="heatmap__cell is-empty" />;
                    const future = day.dateKey > today;
                    const cls = day.done ? "is-done" : future ? "is-future" : "is-missed";
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        className={`heatmap__cell ${cls} ${day.dateKey === today ? "is-today" : ""}`}
                        title={`${dayLabel(day.date)}: ${day.done ? done.get(day.dateKey)?.workout || "Done" : future ? "Upcoming" : "No workout"}`}
                        disabled={future}
                        onClick={() => onDayClick(day.dateKey)}
                        aria-label={`${dayLabel(day.date)}: ${day.done ? "workout logged" : future ? "upcoming" : "no workout"}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><i className="legend__dot is-done" /> Done</span>
        <span><i className="legend__dot is-missed" /> Missed</span>
        <span><i className="legend__dot is-future" /> Upcoming</span>
      </div>
    </section>
  );
}
