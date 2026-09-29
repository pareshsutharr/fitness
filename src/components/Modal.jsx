import { useEffect, useMemo, useRef, useState } from "react";
import { durationToMinutes, formatLongDate, minutesToDuration, parseDateKey } from "../utils/date.js";

const WORKOUTS = ["Gym", "Run", "Walk", "Yoga", "Cycling", "HIIT", "Dance", "Sports", "Core", "Swim"];
const DURATIONS = [
  { label: "20m", minutes: 20 },
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "1h", minutes: 60 },
  { label: "1h 30m", minutes: 90 }
];
const INTENSITIES = [
  { id: "Chill", hint: "Easy, recovery" },
  { id: "Focused", hint: "Solid effort" },
  { id: "Beast mode", hint: "All out" }
];

const splitDuration = (value) => {
  const minutes = durationToMinutes(value);
  return { hours: String(Math.floor(minutes / 60)), minutes: String(minutes % 60) };
};

export default function Modal({ isOpen, dateKey, today, entry, userName, saving, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ workout: "", hours: "1", minutes: "0", intensity: "Focused", notes: "" });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const parts = splitDuration(entry?.duration || "01:00");
    setForm({
      workout: entry?.workout ?? "",
      hours: parts.hours,
      minutes: parts.minutes,
      intensity: entry?.intensity ?? "Focused",
      notes: entry?.notes ?? ""
    });
    setError("");
    setConfirmDelete(false);
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, entry, dateKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const totalMinutes = useMemo(
    () => (Number(form.hours) || 0) * 60 + (Number(form.minutes) || 0),
    [form.hours, form.minutes]
  );

  if (!isOpen || !dateKey) return null;

  const isToday = dateKey === today;
  const title = entry ? "Edit workout" : isToday ? "Today's workout" : "Log a missed day";
  const dateLabel = formatLongDate(parseDateKey(dateKey));

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    const workout = form.workout.trim();
    if (!workout) return setError("Pick or type a workout.");
    if (totalMinutes <= 0) return setError("Add a duration.");
    setError("");
    onSave(dateKey, {
      workout,
      duration: minutesToDuration(totalMinutes),
      intensity: form.intensity,
      notes: form.notes.trim()
    });
  };

  return (
    <div className="modal is-open" role="presentation">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal__close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">{userName} · {dateLabel}</p>
        <h3 id="modal-title">{title}</h3>

        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="workout">Workout</label>
            <div className="chips chips--wrap">
              {WORKOUTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip chip--pick ${form.workout === item ? "is-active" : ""}`}
                  onClick={() => setField("workout", item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              id="workout"
              ref={firstFieldRef}
              type="text"
              value={form.workout}
              onChange={(event) => setField("workout", event.target.value)}
              placeholder="Or type your own, e.g. Run + core"
              maxLength={60}
            />
          </div>

          <div className="field">
            <label>Duration</label>
            <div className="chips">
              {DURATIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`chip chip--pick ${totalMinutes === item.minutes ? "is-active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, hours: String(Math.floor(item.minutes / 60)), minutes: String(item.minutes % 60) }))}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="duration">
              <label className="duration__part">
                <input type="number" min="0" max="23" inputMode="numeric" value={form.hours} onChange={(event) => setField("hours", event.target.value.slice(0, 2))} aria-label="Hours" />
                <span>hr</span>
              </label>
              <label className="duration__part">
                <input type="number" min="0" max="59" inputMode="numeric" value={form.minutes} onChange={(event) => setField("minutes", event.target.value.slice(0, 2))} aria-label="Minutes" />
                <span>min</span>
              </label>
            </div>
          </div>

          <div className="field">
            <label>Intensity</label>
            <div className="seg seg--full" role="radiogroup">
              {INTENSITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={form.intensity === item.id}
                  className={`seg__item ${form.intensity === item.id ? "is-active" : ""}`}
                  onClick={() => setField("intensity", item.id)}
                  title={item.hint}
                >
                  {item.id}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notes <span className="muted">(optional)</span></label>
            <textarea id="notes" rows="2" value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="How did it feel?" maxLength={500} />
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal__actions">
            {entry ? (
              confirmDelete ? (
                <button className="ghost is-danger" type="button" onClick={() => onDelete(dateKey)} disabled={saving}>
                  Yes, remove it
                </button>
              ) : (
                <button className="ghost is-danger" type="button" onClick={() => setConfirmDelete(true)} disabled={saving}>
                  Remove
                </button>
              )
            ) : null}
            <span className="spacer" />
            <button className="ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="cta" type="submit" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Save workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
