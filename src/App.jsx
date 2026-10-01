import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Tabs from "./components/Tabs.jsx";
import LoginPanel from "./components/LoginPanel.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CalendarPanel from "./components/CalendarPanel.jsx";
import Modal from "./components/Modal.jsx";
import { api } from "./api.js";
import { formatLongDate, parseDateKey, toDateKey } from "./utils/date.js";

const REFERENCE_YEAR = 2026;
const baseDate = new Date(REFERENCE_YEAR, 0, 1);

const buildEntry = (data) => {
  const time = new Date(baseDate);
  time.setDate(baseDate.getDate() + (data.dayOffset ?? 0));
  time.setHours(data.hour ?? 9, 0, 0, 0);
  return {
    workout: data.workout,
    duration: data.duration,
    intensity: data.intensity,
    notes: data.notes,
    time,
    dateKey: toDateKey(time)
  };
};

const buildUsers = () => [
  {
    name: "Jahnvi",
    initials: "JA",
    color: "coral",
    vibe: "Strength + dance",
    total: 0,
    streak: 0,
    badges: 0,
    entries: []
  },
  {
    name: "Divesh",
    initials: "DI",
    color: "mint",
    vibe: "Cardio + core",
    total: 0,
    streak: 0,
    badges: 0,
    entries: []
  },
  {
    name: "Paresh",
    initials: "PA",
    color: "sun",
    vibe: "Mobility + strength",
    total: 0,
    streak: 0,
    badges: 0,
    entries: []
  }
];

const ACTIVE_USER_KEY = "fitquestActiveUser";
const THEME_KEY = "fitquestTheme";

const normalizeUsers = (items) =>
  items.map((user) => ({
    ...user,
    entries: Array.isArray(user.entries)
      ? user.entries.map((entry) => ({
          ...entry,
          time: entry.time
            ? new Date(entry.time)
            : entry.dateKey
              ? parseDateKey(entry.dateKey)
              : new Date()
        }))
      : []
  }));

const getEntryForDate = (user, dateKey) =>
  user.entries.find((entry) => entry.dateKey === dateKey);

const getReferenceDate = () => {
  const now = new Date();
  if (now < baseDate) {
    return new Date(baseDate);
  }
  return now;
};

export default function App() {
  const [users, setUsers] = useState(buildUsers);
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false);
  const [activeUserName, setActiveUserName] = useState("Jahnvi");
  const hasInitializedActiveRef = useRef(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const cached = window.localStorage.getItem(THEME_KEY);
    return cached === "light" || cached === "dark" ? cached : "dark";
  });
  const [modalState, setModalState] = useState({
    open: false,
    view: "form",
    dateKey: null
  });

  const activeUser = useMemo(
    () => users.find((user) => user.name === activeUserName) ?? users[0],
    [users, activeUserName]
  );
  const referenceDate = useMemo(() => getReferenceDate(), []);
  const referenceKey = useMemo(
    () => toDateKey(referenceDate),
    [referenceDate]
  );

  useEffect(() => {
    let isActive = true;
    const loadUsers = async () => {
      try {
        const data = await api.users();
        const list = Array.isArray(data?.users) ? data.users : data;
        if (isActive) {
          const nextUsers = Array.isArray(list) ? normalizeUsers(list) : buildUsers();
          setUsers(nextUsers);
          setHasLoadedUsers(true);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setHasLoadedUsers(true);
        }
      }
    };
    loadUsers();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!users.length) return;
    if (!hasInitializedActiveRef.current) {
      const cached =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(ACTIVE_USER_KEY);
      if (cached && users.some((user) => user.name === cached)) {
        setActiveUserName(cached);
      } else {
        setActiveUserName(users[0].name);
      }
      hasInitializedActiveRef.current = true;
      return;
    }
    if (!users.some((user) => user.name === activeUserName)) {
      setActiveUserName(users[0].name);
    }
  }, [users, activeUserName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeUserName) return;
    window.localStorage.setItem(ACTIVE_USER_KEY, activeUserName);
  }, [activeUserName]);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = theme;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  const openModal = (dateKey) => {
    const entry = getEntryForDate(activeUser, dateKey);
    const view =
      dateKey === referenceKey ? "form" : entry ? "details" : "missed";
    setModalState({ open: true, view, dateKey });
  };

  // Tapping a reminder notification opens /?log=today: jump to today's form.
  useEffect(() => {
    if (!hasLoadedUsers || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("log") !== "today") return;
    window.history.replaceState({}, "", window.location.pathname);
    setActiveTab("user");
    setModalState({ open: true, view: "form", dateKey: referenceKey });
  }, [hasLoadedUsers, referenceKey]);

  const closeModal = () =>
    setModalState({ open: false, view: "form", dateKey: null });

  const handleEdit = () =>
    setModalState((prev) => ({ ...prev, view: "form" }));

  // Entries are saved one at a time; the app never writes whole users back.
  const replaceUser = (nextUser) => {
    const [normalized] = normalizeUsers([nextUser]);
    setUsers((prev) =>
      prev.map((user) => (user.name === normalized.name ? normalized : user))
    );
  };

  const handleSaveEntry = async (dateKey, data) => {
    if (!dateKey || !activeUser) return;
    try {
      const result = await api.saveEntry(activeUser.name, dateKey, {
        workout: data.workout.trim(),
        duration: data.duration.trim(),
        intensity: data.intensity,
        notes: data.notes.trim()
      });
      replaceUser(result.user);
      closeModal();
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Could not save the workout.");
    }
  };

  const handleDeleteEntry = async (dateKey) => {
    if (!dateKey || !activeUser) return;
    try {
      const result = await api.deleteEntry(activeUser.name, dateKey);
      replaceUser(result.user);
      closeModal();
    } catch (error) {
      console.error(error);
      window.alert(error.message || "Could not remove the workout.");
    }
  };

  const handleToggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <div className="app-shell">
      <div className="bg-layer bg-layer--left"></div>
      <div className="bg-layer bg-layer--right"></div>
      <main className="app">
        <Header theme={theme} onToggleTheme={handleToggleTheme} />
        <Tabs activeTab={activeTab} onChange={setActiveTab} />
        {activeTab === "user" ? (
          <LoginPanel
            users={users}
            activeUser={activeUser}
            onSelectUser={setActiveUserName}
          />
        ) : null}

        {activeTab === "dashboard" ? (
          <Dashboard
            users={users}
            activeUserName={activeUserName}
            onSenderChange={setActiveUserName}
          />
        ) : (
          <CalendarPanel
            user={activeUser}
            onDayClick={openModal}
            referenceDate={referenceDate}
          />
        )}
      </main>

      <Modal
        isOpen={modalState.open}
        view={modalState.view}
        dateKey={modalState.dateKey}
        isToday={modalState.dateKey === referenceKey}
        entry={
          modalState.dateKey
            ? getEntryForDate(activeUser, modalState.dateKey)
            : null
        }
        dateLabel={
          modalState.dateKey
            ? formatLongDate(parseDateKey(modalState.dateKey))
            : ""
        }
        onClose={closeModal}
        onEdit={handleEdit}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />
    </div>
  );
}
