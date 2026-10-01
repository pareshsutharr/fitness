export default function LoginPanel({ users, activeUser, onSelectUser }) {
  return (
    <section className="panel login-panel">
      <div className="panel-head">
        <h2>Login squad</h2>
      </div>
      <div className="login-grid">
        {users.map((user) => {
          const isActive = user.name === activeUser?.name;
          return (
            <article
              key={user.name}
              className={`login-card ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectUser(user.name)}
            >
              <div className={`avatar ${user.color}`}>{user.initials}</div>
              <div className="player-meta">
                <h3>{user.name}</h3>
              </div>
              <button
                className="login-button"
                type="button"
                aria-pressed={isActive}
              >
                {isActive ? "Logged in" : "Log in"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
