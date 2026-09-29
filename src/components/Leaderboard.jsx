import { useMemo } from "react";
import { computeStreaks, summarizeMonth, summarizeYear } from "../utils/stats.js";
import { formatMinutes } from "../utils/date.js";

export default function Leaderboard({ users, activeUser, today, year, onSelectUser }) {
  const month = Number(today.slice(5, 7)) - 1;
  const rows = useMemo(
    () =>
      users
        .map((user) => ({
          user,
          year: summarizeYear(user.entries, year),
          month: summarizeMonth(user.entries, year, month),
          streak: computeStreaks(user.entries, today).current
        }))
        .sort((a, b) => b.year.days - a.year.days || b.streak - a.streak),
    [users, year, month, today]
  );
  const top = rows[0]?.year.days || 1;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Leaderboard</h2>
        <span className="tag">{year}</span>
      </div>
      <ol className="board">
        {rows.map((row, index) => (
          <li
            key={row.user.name}
            className={`board__row ${row.user.name === activeUser.name ? "is-me" : ""}`}
            onClick={() => onSelectUser(row.user.name)}
          >
            <span className={`board__rank rank-${index + 1}`}>{index + 1}</span>
            <span className={`avatar ${row.user.color}`}>{row.user.initials}</span>
            <div className="board__meta">
              <strong>{row.user.name}</strong>
              <span className="muted">
                {row.month.days} this month · {formatMinutes(row.year.minutes)} · 🔥 {row.streak}
              </span>
              <span className="board__bar">
                <span className={`board__fill ${row.user.color}`} style={{ width: `${Math.max(4, (row.year.days / top) * 100)}%` }} />
              </span>
            </div>
            <span className="board__score">
              {row.year.days}
              <small>days</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
