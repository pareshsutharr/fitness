import usePush from "../hooks/usePush.js";
import { achievementsFor, computeStreaks, summarizeYear } from "../utils/stats.js";
import { formatMinutes } from "../utils/date.js";

const REMINDER_LABEL = "8:00 PM IST";

export default function ProfilePanel({ users, activeUser, today, onSelectUser, theme, onToggleTheme, onToast }) {
  const push = usePush(activeUser?.name);
  const year = Number(today.slice(0, 4));
  const achievements = achievementsFor(activeUser.entries, today);
  const earned = achievements.filter((item) => item.earned).length;
  const { longest } = computeStreaks(activeUser.entries, today);
  const yearStats = summarizeYear(activeUser.entries, year);

  const handleEnable = async () => {
    const ok = await push.enable();
    if (ok) onToast(`Reminders on for ${activeUser.name} on this device.`, "success");
  };

  const handleDisable = async () => {
    await push.disable();
    onToast("Reminders turned off for this device.", "info");
  };

  return (
    <section className="tab-panel" role="tabpanel" aria-label="Profile">
      <section className="panel">
        <div className="panel-head">
          <h2>Who is using this device?</h2>
          <span className="tag">Squad of {users.length}</span>
        </div>
        <p className="muted">Pick yourself. Workouts and chat messages are saved under this name, and reminders go to this device.</p>
        <div className="identity-grid">
          {users.map((user) => {
            const active = user.name === activeUser.name;
            const streak = computeStreaks(user.entries, today).current;
            return (
              <article key={user.name} className={`identity ${user.color} ${active ? "is-active" : ""}`}>
                <span className={`avatar avatar--lg ${user.color}`}>{user.initials}</span>
                <div className="identity__meta">
                  <h3>{user.name}</h3>
                  <p className="muted">{user.vibe}</p>
                  <p className="muted">🔥 {streak}-day streak · {summarizeYear(user.entries, year).days} days in {year}</p>
                </div>
                <button
                  type="button"
                  className={active ? "cta" : "ghost"}
                  onClick={() => onSelectUser(user.name)}
                  aria-pressed={active}
                >
                  {active ? "✓ This is me" : "This is me"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Daily reminder</h2>
            <span className={`tag ${push.subscribed ? "tag--on" : ""}`}>{push.subscribed ? "On" : "Off"}</span>
          </div>
          <p className="muted">
            Every day at {REMINDER_LABEL}, if <strong>{activeUser.name}</strong> has not logged a workout yet, this device gets a nudge.
            Log before then and nothing is sent.
          </p>

          {push.support === "checking" ? <p className="muted">Checking notification support…</p> : null}

          {push.support === "needs-install" ? (
            <div className="notice">
              <strong>Install the app first (iPhone / iPad).</strong>
              <ol>
                <li>Open this page in Safari.</li>
                <li>Tap the Share button, then <em>Add to Home Screen</em>.</li>
                <li>Open FitQuest from your home screen and come back here to turn reminders on.</li>
              </ol>
            </div>
          ) : null}

          {push.support === "unsupported" ? (
            <div className="notice">This browser does not support push notifications. Try Chrome on Android, or install the app on iPhone.</div>
          ) : null}

          {push.support === "ready" ? (
            <div className="actions">
              {push.subscribed ? (
                <>
                  <button className="ghost" type="button" onClick={handleDisable} disabled={push.busy}>
                    Turn off on this device
                  </button>
                  <button className="cta" type="button" onClick={push.sendTest} disabled={push.busy}>
                    Send a test
                  </button>
                </>
              ) : (
                <button className="cta" type="button" onClick={handleEnable} disabled={push.busy}>
                  {push.busy ? "Turning on…" : "Turn on reminders"}
                </button>
              )}
            </div>
          ) : null}

          {push.permission === "denied" ? (
            <p className="form-error">Notifications are blocked for this site. Allow them in the browser or system settings, then try again.</p>
          ) : null}
          {push.error ? <p className="form-error">{push.error}</p> : null}
          {push.lastTest ? <p className="form-ok">{push.lastTest}</p> : null}
          <p className="muted small">Each device subscribes separately. Switch "This is me" and the device follows the new name.</p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Achievements</h2>
            <span className="tag">{earned} / {achievements.length}</span>
          </div>
          <p className="muted">
            Longest streak {longest} day{longest === 1 ? "" : "s"} · {yearStats.days} sessions and {formatMinutes(yearStats.minutes)} in {year}.
          </p>
          <ul className="badges">
            {achievements.map((item) => (
              <li key={item.id} className={`badge ${item.earned ? "is-earned" : ""}`} title={item.detail}>
                <span className="badge__emoji" aria-hidden="true">{item.emoji}</span>
                <span className="badge__label">{item.label}</span>
                <span className="badge__detail">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Appearance</h2>
          </div>
          <div className="actions">
            <button className="ghost" type="button" onClick={onToggleTheme}>
              Switch to {theme === "dark" ? "light" : "dark"} theme
            </button>
          </div>
          <p className="muted small">Add FitQuest to your home screen for a full-screen app feel and reliable reminders.</p>
        </section>
      </div>
    </section>
  );
}
