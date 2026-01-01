import { useEffect, useMemo, useRef, useState } from "react";
import { toDateKey } from "../utils/date.js";

const MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_SENDER_KEY = "fitquestActiveSender";

const normalizeMessage = (item) => {
  const timeRaw = item?.time ?? item?.createdAt ?? item?.created_at ?? null;
  const parsedTime = timeRaw ? new Date(timeRaw) : new Date();
  const time = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;
  return {
    id:
      item?.id ??
      item?._id ??
      `${time.getTime()}-${Math.random().toString(16).slice(2)}`,
    user: item?.user ?? "Unknown",
    text: item?.text ?? "",
    time
  };
};

const filterRecentMessages = (items) => {
  const now = Date.now();
  return items.filter(
    (item) => now - item.time.getTime() <= MESSAGE_TTL_MS
  );
};

const sortMessagesByTime = (items) =>
  [...items].sort((a, b) => a.time.getTime() - b.time.getTime());

const formatChatTime = (time) =>
  time.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });

const CONSISTENCY_YEAR = 2026;

const buildConsistencyMonths = (year, completedDays) => {
  const months = [];

  for (let month = 0; month < 12; month += 1) {
    const start = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = Array(7).fill(null);

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const dayIndex = (date.getDay() + 6) % 7;
      const dateKey = toDateKey(date);
      week[dayIndex] = {
        date,
        dateKey,
        done: completedDays.has(dateKey)
      };

      if (dayIndex === 6) {
        weeks.push(week);
        week = Array(7).fill(null);
      }
    }

    if (week.some(Boolean)) {
      weeks.push(week);
    }

    months.push({
      key: `${year}-${month + 1}`,
      label: start.toLocaleDateString(undefined, { month: "short" }),
      weeks
    });
  }

  return months;
};

const formatConsistencyDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

export default function Dashboard({ users, activeUserName, onSenderChange }) {
  const leaderboard = useMemo(() => {
    const yearPrefix = `${CONSISTENCY_YEAR}-`;
    return [...users]
      .map((user) => ({
        ...user,
        yearStreak: Array.isArray(user.entries)
          ? user.entries.filter((entry) => entry.dateKey?.startsWith(yearPrefix))
              .length
          : 0
      }))
      .sort((a, b) => b.yearStreak - a.yearStreak);
  }, [users]);
  const userLookup = useMemo(
    () => new Map(users.map((user) => [user.name, user])),
    [users]
  );

  const [activeSender, setActiveSender] = useState(users[0]?.name ?? "");
  const [message, setMessage] = useState("");
  const [isSenderOpen, setIsSenderOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [liveClock, setLiveClock] = useState(new Date());
  const chatLogRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const hasInitializedSenderRef = useRef(false);
  const suppressSenderSyncRef = useRef(false);
  const senderMenuRef = useRef(null);
  const consistencyUser =
    users.find((user) => user.name === activeUserName)?.name ?? users[0]?.name ?? "";

  useEffect(() => {
    if (!users.length) return;
    if (!hasInitializedSenderRef.current) {
      const cached =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(ACTIVE_SENDER_KEY);
      if (cached && users.some((user) => user.name === cached)) {
        setActiveSender(cached);
      } else if (activeUserName && users.some((user) => user.name === activeUserName)) {
        setActiveSender(activeUserName);
      } else {
        setActiveSender(users[0].name);
      }
      hasInitializedSenderRef.current = true;
      return;
    }
    if (!users.some((user) => user.name === activeSender)) {
      setActiveSender(
        activeUserName && users.some((user) => user.name === activeUserName)
          ? activeUserName
          : users[0].name
      );
    }
  }, [users, activeSender, activeUserName]);

  useEffect(() => {
    if (!activeUserName) return;
    if (!users.some((user) => user.name === activeUserName)) return;
    suppressSenderSyncRef.current = true;
    setActiveSender(activeUserName);
  }, [activeUserName, users]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeSender) return;
    window.localStorage.setItem(ACTIVE_SENDER_KEY, activeSender);
    if (suppressSenderSyncRef.current) {
      suppressSenderSyncRef.current = false;
      return;
    }
    if (activeSender !== activeUserName) {
      onSenderChange?.(activeSender);
    }
  }, [activeSender, activeUserName, onSenderChange]);

  useEffect(() => {
    let isActive = true;
    const loadMessages = async () => {
      try {
        const response = await fetch("/api/messages");
        if (!response.ok) {
          throw new Error("Failed to load messages");
        }
        const data = await response.json();
        const normalized = sortMessagesByTime(
          filterRecentMessages(data.map((item) => normalizeMessage(item)))
        );
        if (isActive) {
          setMessages((prev) => {
            if (
              prev.length === normalized.length &&
              prev.every((msg, index) => msg.id === normalized[index]?.id)
            ) {
              return prev;
            }
            return normalized;
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveClock(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (!senderMenuRef.current) return;
      if (!senderMenuRef.current.contains(event.target)) {
        setIsSenderOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setIsSenderOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    const el = chatLogRef.current;
    if (!el || !shouldAutoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleChatScroll = () => {
    const el = chatLogRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < threshold;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !activeSender) return;
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: activeSender, text: trimmed })
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      const saved = normalizeMessage(await response.json());
      setMessages((prev) =>
        sortMessagesByTime(filterRecentMessages([...prev, saved]))
      );
      shouldAutoScrollRef.current = true;
      setMessage("");
    } catch (error) {
      console.error(error);
    }
  };

  const getInitials = (name) => name.slice(0, 2).toUpperCase();
  const activeConsistencyUser =
    users.find((user) => user.name === consistencyUser) ?? users[0];
  const completedDays = useMemo(() => {
    const set = new Set();
    activeConsistencyUser?.entries.forEach((entry) => {
      set.add(entry.dateKey);
    });
    return set;
  }, [activeConsistencyUser]);
  const consistencyYear = CONSISTENCY_YEAR;
  const consistencyMonths = useMemo(
    () => buildConsistencyMonths(consistencyYear, completedDays),
    [consistencyYear, completedDays]
  );
  const liveTimeLabel = liveClock.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });

  return (
    <section
      id="panel-dashboard"
      className="tab-panel is-active"
      role="tabpanel"
      aria-labelledby="tab-dashboard"
    >
      <div className="grid dashboard-grid">
        <section className="panel leaderboard">
          <div className="panel-head">
            <h2>Leaderboard</h2>
            <span className="tag">This year</span>
          </div>
          <ol className="leaderboard-list">
            {leaderboard.map((user, index) => (
              <li key={user.name}>
                <span className="rank">{index + 1}</span>
                <div>
                  <h3>{user.name}</h3>
                </div>
                <span className="score">{user.yearStreak} days</span>
              </li>
            ))}
          </ol>
          <div className="leaderboard-art" aria-hidden="true" />
        </section>

        <section className="panel feed-panel">
          <div className="panel-head">
            <h2>Squad chat</h2>
            <span className="tag">Live · {liveTimeLabel}</span>
          </div>
          <div className="chat-box">
            <div
              className="chat-messages"
              role="log"
              aria-live="polite"
              ref={chatLogRef}
              onScroll={handleChatScroll}
            >
              {messages.length ? (
                messages.map((item) => {
                  const user = userLookup.get(item.user);
                  return (
                    <div
                      key={item.id}
                      className={`chat-message ${user?.color ?? ""}`}
                    >
                      <div className={`avatar ${user?.color ?? ""}`}>
                        {user?.initials ?? getInitials(item.user)}
                      </div>
                      <div className="chat-bubble">
                        <p>{item.text}</p>
                        <span className="chat-time">
                          {formatChatTime(item.time)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="chat-empty">No messages yet. Start the chat.</p>
              )}
            </div>
            <form className="chat-form" onSubmit={handleSubmit}>
              <div className="chat-user chat-select" ref={senderMenuRef}>
                <span>Sender</span>
                <button
                  type="button"
                  className="chat-select__trigger"
                  aria-haspopup="listbox"
                  aria-expanded={isSenderOpen}
                  aria-controls="sender-options"
                  onClick={() => setIsSenderOpen((prev) => !prev)}
                >
                  <span>{activeSender}</span>
                  <span className="chat-select__icon" aria-hidden="true" />
                </button>
                {isSenderOpen && (
                  <div
                    className="chat-select__menu"
                    role="listbox"
                    id="sender-options"
                  >
                    {users.map((user) => {
                      const isSelected = user.name === activeSender;
                      return (
                        <button
                          key={user.name}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`chat-select__option ${
                            isSelected ? "is-selected" : ""
                          }`}
                          onClick={() => {
                            setActiveSender(user.name);
                            setIsSenderOpen(false);
                          }}
                        >
                          {user.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <label className="chat-entry">
                <span>Message</span>
                <input
                  type="text"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Share a win or plan..."
                />
              </label>
              <button className="cta" type="submit" disabled={!activeSender}>
                Send
              </button>
            </form>
          </div>
        </section>

        <section className="panel consistency-panel">
          <div className="panel-head">
            <div className="consistency-title">
              <h2>Workout consistency</h2>
              <span className="consistency-year">{consistencyYear}</span>
            </div>
            <div className="consistency-tabs" role="tablist">
              {users.map((user) => (
                <button
                  key={user.name}
                  type="button"
                  role="tab"
                  aria-selected={user.name === consistencyUser}
                  className={`consistency-tab ${
                    user.name === consistencyUser ? "is-active" : ""
                  }`}
                  onClick={() => onSenderChange?.(user.name)}
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>
          <div className="consistency-legend">
            <span className="legend-dot done" aria-hidden="true"></span>
            <span>Done</span>
            <span className="legend-dot missed" aria-hidden="true"></span>
            <span>Missed</span>
          </div>
          <div className="consistency-grid" role="presentation">
            {consistencyMonths.map((month) => (
              <div className="consistency-month" key={month.key}>
                <span className="consistency-month-label">{month.label}</span>
                <div className="consistency-month-grid">
                  {month.weeks.map((week, weekIndex) => (
                    <div
                      className="consistency-week"
                      key={`${month.key}-week-${weekIndex}`}
                    >
                      {week.map((day, dayIndex) =>
                        day ? (
                          <span
                            key={day.dateKey}
                            className={`consistency-cell ${
                              day.done ? "is-done" : "is-missed"
                            }`}
                            data-label={formatConsistencyDate(day.date)}
                            aria-label={`${formatConsistencyDate(day.date)}: ${
                              day.done ? "Workout completed" : "No workout"
                            }`}
                          />
                        ) : (
                          <span
                            key={`${month.key}-empty-${weekIndex}-${dayIndex}`}
                            className="consistency-cell is-empty"
                            aria-hidden="true"
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

    </section>
  );
}
