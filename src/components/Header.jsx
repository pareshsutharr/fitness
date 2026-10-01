export default function Header({ theme = "dark", onToggleTheme }) {
  const label = theme === "light" ? "Light" : "Dark";
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">FQ</span>
        <div>
          <h1>FitQuest Arcade</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
        >
          <span className="theme-toggle__label">Theme</span>
          <span className="theme-toggle__value">{label}</span>
        </button>
      </div>
    </header>
  );
}
