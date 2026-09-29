const pad = (n) => String(n).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const shiftDateKey = (key, days) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const todayKey = () => toDateKey(new Date());

export const formatShortDate = (date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const formatLongDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

export const formatWeekday = (date) =>
  date.toLocaleDateString(undefined, { weekday: "long" });

export const monthLabel = (year, month, style = "long") =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: style });

export const durationToMinutes = (value) => {
  if (!value || typeof value !== "string") return 0;
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const digits = value.match(/\d+/g);
  if (!digits) return 0;
  return digits.length >= 2 ? Number(digits[0]) * 60 + Number(digits[1]) : Number(digits[0]);
};

export const minutesToDuration = (minutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
};

export const formatMinutes = (minutes) => {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const formatClock = (date) =>
  date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const relativeDay = (date, today = new Date()) => {
  const key = toDateKey(date);
  const now = toDateKey(today);
  if (key === now) return "Today";
  if (key === shiftDateKey(now, -1)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};
