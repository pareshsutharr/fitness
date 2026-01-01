export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatShortDate = (date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });

export const formatLongDate = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

export const clampDay = (offset, hour = 9) => {
  const base = new Date();
  const day = Math.max(1, base.getDate() - offset);
  return new Date(base.getFullYear(), base.getMonth(), day, hour);
};
