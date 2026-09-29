import { durationToMinutes, parseDateKey, shiftDateKey, toDateKey } from "./date.js";

export const entryMap = (entries = []) => {
  const map = new Map();
  for (const entry of entries) {
    if (entry?.dateKey) map.set(entry.dateKey, entry);
  }
  return map;
};

export const computeStreaks = (entries = [], today) => {
  const keys = new Set(entries.map((e) => e.dateKey).filter(Boolean));
  let current = 0;
  let cursor = keys.has(today) ? today : shiftDateKey(today, -1);
  while (keys.has(cursor)) {
    current += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  const sorted = [...keys].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    run = prev && shiftDateKey(prev, 1) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }
  return { current, longest, activeToday: keys.has(today) };
};

export const weekKeys = (today) => {
  const date = parseDateKey(today);
  const offset = (date.getDay() + 6) % 7; // Monday first
  const monday = shiftDateKey(today, -offset);
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(monday, i));
};

export const summarize = (entries = [], predicate) => {
  let days = 0;
  let minutes = 0;
  for (const entry of entries) {
    if (!entry?.dateKey || !predicate(entry.dateKey)) continue;
    days += 1;
    minutes += durationToMinutes(entry.duration);
  }
  return { days, minutes };
};

export const summarizeWeek = (entries, today) => {
  const keys = new Set(weekKeys(today));
  return summarize(entries, (key) => keys.has(key));
};

export const summarizeMonth = (entries, year, month) => {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  return summarize(entries, (key) => key.startsWith(prefix));
};

export const summarizeYear = (entries, year) =>
  summarize(entries, (key) => key.startsWith(`${year}-`));

export const workoutBreakdown = (entries = [], limit = 4) => {
  const counts = new Map();
  for (const entry of entries) {
    const label = (entry.workout || "Workout").trim();
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
};

export const achievementsFor = (entries = [], today) => {
  const { current, longest } = computeStreaks(entries, today);
  const total = new Set(entries.map((e) => e.dateKey)).size;
  const beast = entries.filter((e) => e.intensity === "Beast mode").length;
  const minutes = entries.reduce((sum, e) => sum + durationToMinutes(e.duration), 0);
  return [
    { id: "first", emoji: "🎮", label: "First quest", detail: "Log your first workout", earned: total >= 1 },
    { id: "week", emoji: "🔥", label: "7-day streak", detail: "Seven days in a row", earned: longest >= 7 },
    { id: "month", emoji: "🌙", label: "30-day streak", detail: "A full month without a miss", earned: longest >= 30 },
    { id: "fifty", emoji: "🏅", label: "50 sessions", detail: "Fifty workouts logged", earned: total >= 50 },
    { id: "hundred", emoji: "💯", label: "Century", detail: "One hundred workouts", earned: total >= 100 },
    { id: "beast", emoji: "🦍", label: "Beast mode", detail: "Five beast-mode sessions", earned: beast >= 5 },
    { id: "hours", emoji: "⏱️", label: "50 hours", detail: "Fifty hours of training", earned: minutes >= 50 * 60 },
    { id: "live", emoji: "⚡", label: "On fire", detail: "Current streak of 3+", earned: current >= 3 }
  ];
};

export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const total = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, dateKey: toDateKey(date) });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
};

export const buildYearHeatmap = (year, doneKeys) => {
  const months = [];
  for (let month = 0; month < 12; month += 1) {
    const total = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = Array(7).fill(null);
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(year, month, day);
      const index = (date.getDay() + 6) % 7;
      const dateKey = toDateKey(date);
      week[index] = { date, dateKey, done: doneKeys.has(dateKey) };
      if (index === 6) {
        weeks.push(week);
        week = Array(7).fill(null);
      }
    }
    if (week.some(Boolean)) weeks.push(week);
    months.push({ month, weeks });
  }
  return months;
};
