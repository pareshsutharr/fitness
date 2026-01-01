export default function Tabs({ activeTab, onChange }) {
  return (
    <nav className="tabs" role="tablist" aria-label="Page tabs">
      <button
        className={`tab ${activeTab === "dashboard" ? "is-active" : ""}`}
        role="tab"
        aria-selected={activeTab === "dashboard"}
        aria-controls="panel-dashboard"
        id="tab-dashboard"
        type="button"
        onClick={() => onChange("dashboard")}
      >
        Dashboard
      </button>
      <button
        className={`tab ${activeTab === "user" ? "is-active" : ""}`}
        role="tab"
        aria-selected={activeTab === "user"}
        aria-controls="panel-user"
        id="tab-user"
        type="button"
        onClick={() => onChange("user")}
      >
        User Details
      </button>
    </nav>
  );
}
