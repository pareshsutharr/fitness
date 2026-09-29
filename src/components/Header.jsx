export default function Header({ theme, onToggleTheme, activeUser, onOpenProfile }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 10v4M20 10v4M7 8v8M17 8v8M7 12h10" />
          </svg>
        </span>
        <div>
          <h1>FitQuest Arcade</h1>
          <p className="brand-sub">Squad check-ins, streaks and bragging rights</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {activeUser ? (
          <button type="button" className="user-chip" onClick={onOpenProfile} title="Switch user">
            <span className={`avatar avatar--sm ${activeUser.color}`}>{activeUser.initials}</span>
            <span className="user-chip__name">{activeUser.name}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
