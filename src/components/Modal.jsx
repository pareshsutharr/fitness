import { useEffect, useState } from "react";

const defaultForm = {
  workout: "",
  duration: "",
  intensity: "Focused",
  notes: ""
};

const parseDurationParts = (value) => {
  if (!value) return { hours: "", minutes: "" };
  if (value.includes(":")) {
    const [hours, minutes] = value.split(":");
    return {
      hours: hours.replace(/\D/g, ""),
      minutes: minutes.replace(/\D/g, "")
    };
  }
  const digits = value.match(/\d+/g);
  if (!digits) return { hours: "", minutes: "" };
  if (digits.length >= 2) {
    return { hours: digits[0], minutes: digits[1] };
  }
  return { hours: "", minutes: digits[0] };
};

const parseDurationToMinutes = (value) => {
  if (!value || typeof value !== "string") return 0;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 0;
  if (trimmed.includes(":")) {
    const [hours, minutes] = trimmed.split(":");
    const parsedHours = Number(hours);
    const parsedMinutes = Number(minutes);
    if (!Number.isNaN(parsedHours) && !Number.isNaN(parsedMinutes)) {
      return parsedHours * 60 + parsedMinutes;
    }
  }
  const digits = trimmed.match(/\d+/g);
  if (!digits) return 0;
  if (digits.length >= 2) {
    const parsedHours = Number(digits[0]);
    const parsedMinutes = Number(digits[1]);
    if (!Number.isNaN(parsedHours) && !Number.isNaN(parsedMinutes)) {
      return parsedHours * 60 + parsedMinutes;
    }
  }
  const totalMinutes = Number(digits[0]);
  return Number.isNaN(totalMinutes) ? 0 : totalMinutes;
};

const formatDuration = (minutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const normalizeDuration = (value) => {
  if (!value) return "";
  return formatDuration(parseDurationToMinutes(value));
};

const buildDurationValue = (hours, minutes) => {
  if (hours === "" && minutes === "") return "";
  const safeHours = hours === "" ? 0 : Number(hours);
  const safeMinutes = minutes === "" ? 0 : Number(minutes);
  if (Number.isNaN(safeHours) || Number.isNaN(safeMinutes)) return "";
  return formatDuration(safeHours * 60 + safeMinutes);
};

export default function Modal({
  isOpen,
  view,
  dateKey,
  isToday,
  entry,
  dateLabel,
  onClose,
  onEdit,
  onSave,
  onDelete
}) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (view !== "form") return;
    setForm({
      workout: entry?.workout ?? "",
      duration: normalizeDuration(entry?.duration ?? ""),
      intensity: entry?.intensity ?? "Focused",
      notes: entry?.notes ?? ""
    });
  }, [entry, dateKey, view]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!dateKey) return;
    onSave(dateKey, {
      ...form,
      duration: normalizeDuration(form.duration)
    });
  };

  const durationParts = parseDurationParts(form.duration);
  const handleDurationChange = (field) => (event) => {
    const raw = event.target.value;
    const max = field === "hours" ? 23 : 59;
    const nextValue =
      raw === "" ? "" : String(Math.min(max, Math.max(0, Number(raw))));
    const nextHours = field === "hours" ? nextValue : durationParts.hours;
    const nextMinutes = field === "minutes" ? nextValue : durationParts.minutes;
    const nextDuration = buildDurationValue(nextHours, nextMinutes);
    setForm((prev) => ({ ...prev, duration: nextDuration }));
  };

  return (
    <div
      className={`modal ${isOpen ? "is-open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-card" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}>
          x
        </button>
        <h3 id="modal-title">
          {view === "form"
            ? isToday
              ? "Today's workout"
              : entry
              ? "Edit workout"
              : "Log missed workout"
            : view === "details"
            ? "Workout details"
            : "Missed workout"}
        </h3>
        <p className="muted">{dateLabel}</p>

        {view === "form" ? (
          <form className="modal-form" onSubmit={handleSubmit}>
            <label>
              <span>Workout type</span>
              <input
                name="workout"
                value={form.workout}
                onChange={handleChange}
                type="text"
                placeholder="Run + core"
                required
              />
            </label>
            <label>
              <span>Duration</span>
              <div className="duration-control">
                <input
                  name="duration-hours"
                  type="number"
                  min="0"
                  max="23"
                  step="1"
                  value={durationParts.hours}
                  onChange={handleDurationChange("hours")}
                  inputMode="numeric"
                  placeholder="00"
                  required
                />
                <span className="duration-separator">:</span>
                <input
                  name="duration-minutes"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={durationParts.minutes}
                  onChange={handleDurationChange("minutes")}
                  inputMode="numeric"
                  placeholder="00"
                  required
                />
              </div>
            </label>
            <label>
              <span>Notes</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                placeholder="How did it feel?"
              ></textarea>
            </label>
            <div className="modal-actions">
              {entry ? (
                <button
                  className="ghost is-danger"
                  type="button"
                  onClick={() => onDelete(dateKey)}
                >
                  Delete entry
                </button>
              ) : null}
              <button className="ghost" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="cta" type="submit">
                Save entry
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-view">
            {view === "missed" ? (
              <p className="missed-note">You missed a entry.</p>
            ) : (
              <div className="detail-summary">
                <div className="detail-line">
                  <span>Workout</span>
                  <strong>{entry?.workout}</strong>
                </div>
                <div className="detail-line">
                  <span>Duration</span>
                  <strong>{entry?.duration}</strong>
                </div>
                <div className="detail-line">
                  <span>Notes</span>
                  <strong>{entry?.notes || "No notes"}</strong>
                </div>
              </div>
            )}
            <div className="modal-actions">
              {view === "details" && entry ? (
                <button
                  className="ghost is-danger"
                  type="button"
                  onClick={() => onDelete(dateKey)}
                >
                  Delete entry
                </button>
              ) : null}
              <button
                className={`ghost ${view === "missed" ? "is-emphasis" : ""}`}
                type="button"
                onClick={onEdit}
              >
                {view === "missed" ? "Modify Anyway" : "Edit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
