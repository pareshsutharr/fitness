import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { formatClock, relativeDay, toDateKey } from "../utils/date.js";

const POLL_MS = 6000;

const normalize = (item) => {
  const time = new Date(item.time ?? item.createdAt ?? Date.now());
  return {
    id: item.id ?? item._id ?? `${time.getTime()}-${Math.random()}`,
    user: item.user ?? "Unknown",
    text: item.text ?? "",
    time: Number.isNaN(time.getTime()) ? new Date() : time
  };
};

export default function Chat({ users, activeUser, onToast }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);
  const stickRef = useRef(true);
  const lookup = useMemo(() => new Map(users.map((user) => [user.name, user])), [users]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.messages();
        if (!active) return;
        const next = data.map(normalize).sort((a, b) => a.time - b.time);
        setMessages((prev) =>
          prev.length === next.length && prev.every((m, i) => m.id === next[i].id) ? prev : next
        );
      } catch (_error) {
        /* keep the last good list */
      }
    };
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = logRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const saved = normalize(await api.sendMessage(activeUser.name, text));
      setMessages((prev) => [...prev, saved]);
      stickRef.current = true;
      setDraft("");
    } catch (error) {
      onToast(error.message || "Message not sent.", "error");
    } finally {
      setSending(false);
    }
  };

  let lastDay = null;

  return (
    <section className="panel chat">
      <div className="panel-head">
        <h2>Squad chat</h2>
        <span className="tag">Last 7 days</span>
      </div>
      <div className="chat__log" ref={logRef} onScroll={onScroll} role="log" aria-live="polite">
        {messages.length ? (
          messages.map((message) => {
            const day = toDateKey(message.time);
            const showDay = day !== lastDay;
            lastDay = day;
            const author = lookup.get(message.user);
            const mine = message.user === activeUser.name;
            return (
              <div key={message.id}>
                {showDay ? <div className="chat__day">{relativeDay(message.time)}</div> : null}
                <div className={`chat__msg ${mine ? "is-mine" : ""}`}>
                  {!mine ? (
                    <span className={`avatar avatar--sm ${author?.color ?? ""}`}>
                      {author?.initials ?? message.user.slice(0, 2).toUpperCase()}
                    </span>
                  ) : null}
                  <div className={`chat__bubble ${author?.color ?? ""}`}>
                    {!mine ? <span className="chat__author">{message.user}</span> : null}
                    <p>{message.text}</p>
                    <span className="chat__time">{formatClock(message.time)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="chat__empty muted">No messages this week. Say hi to the squad.</p>
        )}
      </div>
      <form className="chat__form" onSubmit={send}>
        <span className={`avatar avatar--sm ${activeUser.color}`} title={`Sending as ${activeUser.name}`}>
          {activeUser.initials}
        </span>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message as ${activeUser.name}…`}
          maxLength={500}
          aria-label="Message"
        />
        <button className="cta" type="submit" disabled={!draft.trim() || sending}>
          Send
        </button>
      </form>
    </section>
  );
}
