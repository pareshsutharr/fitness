import { useMemo } from "react";
import TodayCard from "./TodayCard.jsx";
import StatsRow from "./StatsRow.jsx";
import Leaderboard from "./Leaderboard.jsx";
import Consistency from "./Consistency.jsx";
import Chat from "./Chat.jsx";

export default function HomePanel({ users, activeUser, today, onLog, onSelectUser, onToast }) {
  const year = useMemo(() => Number(today.slice(0, 4)), [today]);
  return (
    <section className="tab-panel" role="tabpanel" aria-label="Home">
      <div className="home-top">
        <TodayCard users={users} user={activeUser} today={today} onLog={onLog} />
        <StatsRow user={activeUser} today={today} />
      </div>
      <div className="home-grid">
        <div className="home-col">
          <Leaderboard users={users} activeUser={activeUser} today={today} year={year} onSelectUser={onSelectUser} />
          <Consistency users={users} activeUser={activeUser} year={year} today={today} onSelectUser={onSelectUser} onDayClick={onLog} />
        </div>
        <div className="home-col">
          <Chat users={users} activeUser={activeUser} onToast={onToast} />
        </div>
      </div>
    </section>
  );
}
