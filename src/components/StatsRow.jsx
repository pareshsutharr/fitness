import { formatMinutes } from "../utils/date.js";
import { computeStreaks, summarizeMonth, summarizeWeek, summarizeYear } from "../utils/stats.js";

export default function StatsRow({ user, today }) {
  const { current, longest } = computeStreaks(user.entries, today);
  const week = summarizeWeek(user.entries, today);
  const [year, month] = today.split("-").map(Number);
  const monthStats = summarizeMonth(user.entries, year, month - 1);
  const yearStats = summarizeYear(user.entries, year);

  const tiles = [
    { label: "Current streak", value: current, unit: current === 1 ? "day" : "days", hint: longest ? `Best ${longest}` : "Let's go" },
    { label: "This week", value: week.days, unit: "/ 7 days", hint: formatMinutes(week.minutes) },
    { label: "This month", value: monthStats.days, unit: "days", hint: formatMinutes(monthStats.minutes) },
    { label: "This year", value: yearStats.days, unit: "days", hint: formatMinutes(yearStats.minutes) }
  ];

  return (
    <div className="stats-row">
      {tiles.map((tile) => (
        <div className="stat-tile" key={tile.label}>
          <span className="stat-tile__label">{tile.label}</span>
          <span className="stat-tile__value">
            {tile.value}
            <small>{tile.unit}</small>
          </span>
          <span className="stat-tile__hint">{tile.hint}</span>
        </div>
      ))}
    </div>
  );
}
