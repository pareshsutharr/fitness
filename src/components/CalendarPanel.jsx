import { useMemo, useState } from "react";
import { formatLongDate, toDateKey } from "../utils/date.js";

const buildYearCalendar = (year) => {
  const months = [];
  for (let month = 0; month < 12; month += 1) {
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = 0; i < offset; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(year, month, day));
    }

    months.push({
      label: firstDay.toLocaleDateString(undefined, { month: "long" }),
      days
    });
  }

  return months;
};

const getEntryForDate = (user, dateKey) =>
  user.entries.find((entry) => entry.dateKey === dateKey);

export default function CalendarPanel({ user, onDayClick, referenceDate }) {
  const months = useMemo(() => buildYearCalendar(2026), []);
  const initialMonth = referenceDate.getMonth();
  const [monthIndex, setMonthIndex] = useState(initialMonth);
  const todayKey = toDateKey(referenceDate);
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const month = months[monthIndex];

  return (
    <section
      id="panel-user"
      className="tab-panel is-active"
      role="tabpanel"
      aria-labelledby="tab-user"
    >
      <section className="panel calendar-panel">
        <div className="panel-head">
          <h2>User calendar</h2>
          <div className="calendar-head">
            <span>2026</span>
          </div>
        </div>
        <div className="calendar-legend">
          <span className="legend-item">
            <span className="legend-dot done">&#10004;</span>Workout done
          </span>
          <span className="legend-item">
            <span className="legend-dot missed">&#10006;</span>No workout
          </span>
          <span className="legend-item">
            <span className="legend-dot today"></span>Today
          </span>
        </div>
        <div className="calendar">
          <div className="month-switch" role="tablist" aria-label="Select month">
            {months.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-selected={index === monthIndex}
                className={`month-tab ${index === monthIndex ? "is-active" : ""}`}
                onClick={() => setMonthIndex(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <section className="month-card">
            <div className="month-title">{month.label} 2026</div>
            <div className="weekday-row">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
            <div className="month-grid">
              {month.days.map((date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`${month.label}-empty-${index}`}
                      className="day-cell is-empty"
                    />
                  );
                }

                const dateKey = toDateKey(date);
                const entry = getEntryForDate(user, dateKey);
                const isToday = dateKey === todayKey;
                const isFuture = date > todayStart;

                const statusIcon = isToday
                  ? "\u23f3"
                  : entry
                  ? "\u2714"
                  : !isFuture
                  ? "\u2716"
                  : "";

                const isMissed = !entry && !isFuture && !isToday;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`day-cell${entry ? " is-done" : ""}${
                      isMissed ? " is-missed" : ""
                    }${isToday ? " is-today" : ""}${
                      isFuture ? " is-future" : ""
                    }`}
                    aria-label={`${formatLongDate(date)}: ${
                      entry
                        ? `${entry.workout}, ${entry.duration}`
                        : isFuture
                        ? "Upcoming"
                        : "No workout logged"
                    }`}
                    onClick={() => !isFuture && onDayClick(dateKey)}
                    disabled={isFuture}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    <span className="day-status">{statusIcon}</span>
                    <span className="day-duration">
                      {entry ? entry.duration : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}
