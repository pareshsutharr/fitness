import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Nav from "./components/Nav.jsx";
import HomePanel from "./components/HomePanel.jsx";
import CalendarPanel from "./components/CalendarPanel.jsx";
import ProfilePanel from "./components/ProfilePanel.jsx";
import Modal from "./components/Modal.jsx";
import Toasts from "./components/Toasts.jsx";
import { api } from "./api.js";
import { todayKey as getTodayKey } from "./utils/date.js";

const ACTIVE_USER_KEY = "fitquestActiveUser";
const THEME_KEY = "fitquestTheme";
const REFRESH_MS = 30000;

const readStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    /* ignore */
  }
};

const normalizeUsers = (items) =>
  items.map((user) => ({
    ...user,
    entries: Array.isArray(user.entries)
      ? user.entries.map((entry) => ({
          ...entry,
          time: entry.time ? new Date(entry.time) : null
        }))
      : []
  }));

export default function App() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState("");
  const [activeUserName, setActiveUserName] = useState(() => readStorage(ACTIVE_USER_KEY) || "");
  const [tab, setTab] = useState("home");
  const [theme, setTheme] = useState(() => {
    const cached = readStorage(THEME_KEY);
    return cached === "light" || cached === "dark" ? cached : "dark";
  });
  const [modal, setModal] = useState({ open: false, dateKey: null });
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState(getTodayKey);
  const pendingDeepLink = useRef(new URLSearchParams(window.location.search).get("log") === "today");

  const pushToast = useCallback((message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatus((prev) => (prev === "ready" ? prev : "loading"));
    try {
      const data = await api.users();
      const list = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
      setUsers(normalizeUsers(list));
      setStatus("ready");
      setLoadError("");
    } catch (error) {
      if (!silent) {
        setStatus("error");
        setLoadError(error.message || "Could not reach the server.");
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Keep friends' progress fresh without hammering the API.
  useEffect(() => {
    if (status !== "ready") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadUsers({ silent: true });
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setToday(getTodayKey());
        loadUsers({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, loadUsers]);

  // Roll the day over at midnight while the app is open.
  useEffect(() => {
    const tick = window.setInterval(() => setToday(getTodayKey()), 60000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!users.length) return;
    if (!users.some((user) => user.name === activeUserName)) {
      setActiveUserName(users[0].name);
    }
  }, [users, activeUserName]);

  useEffect(() => {
    if (activeUserName) writeStorage(ACTIVE_USER_KEY, activeUserName);
  }, [activeUserName]);

  useLayoutEffect(() => {
    document.body.dataset.theme = theme;
    writeStorage(THEME_KEY, theme);
  }, [theme]);

  const activeUser = useMemo(
    () => users.find((user) => user.name === activeUserName) ?? users[0] ?? null,
    [users, activeUserName]
  );

  // Notification tap deep link: open today's log form once data is ready.
  useEffect(() => {
    if (status !== "ready" || !activeUser || !pendingDeepLink.current) return;
    pendingDeepLink.current = false;
    setModal({ open: true, dateKey: today });
    window.history.replaceState({}, "", window.location.pathname);
  }, [status, activeUser, today]);

  const openLog = useCallback((dateKey) => {
    if (!dateKey || dateKey > getTodayKey()) return;
    setModal({ open: true, dateKey });
  }, []);

  const closeModal = useCallback(() => setModal({ open: false, dateKey: null }), []);

  const replaceUser = useCallback((nextUser) => {
    const [normalized] = normalizeUsers([nextUser]);
    setUsers((prev) => prev.map((user) => (user.name === normalized.name ? normalized : user)));
  }, []);

  const handleSaveEntry = async (dateKey, data) => {
    if (!activeUser || saving) return;
    setSaving(true);
    try {
      const result = await api.saveEntry(activeUser.name, dateKey, data);
      replaceUser(result.user);
      closeModal();
      pushToast(dateKey === today ? "Today's workout logged. Nice work!" : "Workout saved.", "success");
    } catch (error) {
      pushToast(error.message || "Could not save the workout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (dateKey) => {
    if (!activeUser || saving) return;
    setSaving(true);
    try {
      const result = await api.deleteEntry(activeUser.name, dateKey);
      replaceUser(result.user);
      closeModal();
      pushToast("Workout removed.", "info");
    } catch (error) {
      pushToast(error.message || "Could not remove the workout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const modalEntry = useMemo(() => {
    if (!modal.dateKey || !activeUser) return null;
    return activeUser.entries.find((entry) => entry.dateKey === modal.dateKey) ?? null;
  }, [modal.dateKey, activeUser]);

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow--a" aria-hidden="true" />
      <div className="bg-glow bg-glow--b" aria-hidden="true" />
      <main className="app">
        <Header
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          activeUser={activeUser}
          onOpenProfile={() => setTab("profile")}
        />
        <Nav active={tab} onChange={setTab} />

        {status === "loading" && !users.length ? (
          <section className="panel state-panel" aria-busy="true">
            <div className="spinner" aria-hidden="true" />
            <p>Loading the squad…</p>
          </section>
        ) : null}

        {status === "error" && !users.length ? (
          <section className="panel state-panel is-error" role="alert">
            <h2>Can't reach the server</h2>
            <p className="muted">{loadError}</p>
            <p className="muted">Nothing was changed. Your data is safe on the server.</p>
            <button className="cta" type="button" onClick={() => loadUsers()}>
              Try again
            </button>
          </section>
        ) : null}

        {users.length && activeUser ? (
          <>
            {tab === "home" ? (
              <HomePanel
                users={users}
                activeUser={activeUser}
                today={today}
                onLog={openLog}
                onSelectUser={setActiveUserName}
                onToast={pushToast}
              />
            ) : null}
            {tab === "calendar" ? (
              <CalendarPanel user={activeUser} today={today} onDayClick={openLog} />
            ) : null}
            {tab === "profile" ? (
              <ProfilePanel
                users={users}
                activeUser={activeUser}
                today={today}
                onSelectUser={setActiveUserName}
                theme={theme}
                onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                onToast={pushToast}
              />
            ) : null}
          </>
        ) : null}
      </main>

      <Modal
        isOpen={modal.open}
        dateKey={modal.dateKey}
        today={today}
        entry={modalEntry}
        userName={activeUser?.name}
        saving={saving}
        onClose={closeModal}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />
      <Toasts items={toasts} />
    </div>
  );
}
