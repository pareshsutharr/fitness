import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import webpush from "web-push";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const APP_TZ = process.env.APP_TZ || "Asia/Kolkata";
const MESSAGE_TTL_SECONDS = 7 * 24 * 60 * 60;
const INTENSITIES = ["Chill", "Focused", "Beast mode"];

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment");
}

const PUSH_ENABLED = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
);
if (PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const app = express();
app.use(express.json({ limit: "200kb" }));

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ---------- database ---------- */

let mongoPromise;
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!mongoPromise) {
    mongoPromise = mongoose
      .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || "fitness" })
      .catch((error) => {
        mongoPromise = null;
        throw error;
      });
  }
  await mongoPromise;
};

const EntrySchema = new mongoose.Schema(
  {
    workout: String,
    duration: String,
    intensity: String,
    notes: String,
    dateKey: String,
    time: Date
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    initials: String,
    color: String,
    vibe: String,
    total: Number,
    streak: Number,
    badges: Number,
    entries: { type: [EntrySchema], default: [] }
  },
  { timestamps: true }
);

const MessageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now, expires: MESSAGE_TTL_SECONDS }
});

const PushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: String, auth: String },
    userAgent: String,
    lastSentAt: Date,
    failures: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
const PushSubscription =
  mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);

const defaultUsers = [
  { name: "Jahnvi", initials: "JA", color: "coral", vibe: "Strength + dance" },
  { name: "Divesh", initials: "DI", color: "mint", vibe: "Cardio + core" },
  { name: "Paresh", initials: "PA", color: "sun", vibe: "Mobility + strength" }
].map((user) => ({ ...user, total: 0, streak: 0, badges: 0, entries: [] }));

/* ---------- helpers ---------- */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// YYYY-MM-DD for "now" in the app's home time zone (the squad lives in IST).
export const dateKeyInTz = (date = new Date(), timeZone = APP_TZ) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const shiftDateKey = (dateKey, days) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

export const computeStats = (entries, todayKey) => {
  const keys = new Set(entries.map((entry) => entry.dateKey).filter(Boolean));
  let streak = 0;
  let cursor = keys.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  while (keys.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  const badges = entries.filter((entry) => entry.intensity === "Beast mode").length;
  return { total: keys.size, streak, badges };
};

const sortEntries = (entries) =>
  [...entries].sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));

const formatUser = (doc) => {
  const { _id, __v, ...rest } = doc;
  return { ...rest, entries: sortEntries(rest.entries || []) };
};

const formatMessage = (doc) => ({
  id: doc._id.toString(),
  user: doc.user,
  text: doc.text,
  time: doc.createdAt
});

const ensureUsers = async () => {
  const count = await User.countDocuments();
  if (!count) await User.insertMany(defaultUsers);
};

const refreshStats = async (name) => {
  const user = await User.findOne({ name }).lean();
  if (!user) throw new HttpError(404, "User not found");
  const stats = computeStats(user.entries || [], dateKeyInTz());
  await User.updateOne({ name }, { $set: stats });
  return formatUser({ ...user, ...stats });
};

const cleanText = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeDuration = (value) => {
  const text = cleanText(value, 10);
  const match = text.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return "";
  const hours = Math.min(23, Number(match[1]));
  const minutes = Math.min(59, Number(match[2]));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/* ---------- routes ---------- */

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, port: PORT, push: PUSH_ENABLED, tz: APP_TZ, today: dateKeyInTz() });
});

app.use(
  asyncHandler(async (_req, _res, next) => {
    await connectDB();
    next();
  })
);

app.get(
  "/api/users",
  asyncHandler(async (_req, res) => {
    await ensureUsers();
    const users = await User.find().lean();
    res.json({ users: users.map(formatUser), today: dateKeyInTz(), serverTime: new Date() });
  })
);

// The old bulk overwrite endpoint is gone on purpose: it let one stale
// browser tab erase every user's history. Stale clients get a clear error.
app.put("/api/users", (_req, res) => {
  res.status(410).json({
    error: "Bulk user updates are no longer supported. Refresh the app to get the latest version."
  });
});

app.put(
  "/api/users/:name/entries/:dateKey",
  asyncHandler(async (req, res) => {
    const { name, dateKey } = req.params;
    if (!DATE_KEY_RE.test(dateKey)) throw new HttpError(400, "Invalid date");
    const todayKey = dateKeyInTz();
    if (dateKey > shiftDateKey(todayKey, 1)) {
      throw new HttpError(400, "You cannot log a workout in the future");
    }

    const workout = cleanText(req.body?.workout, 60);
    const duration = normalizeDuration(req.body?.duration);
    const intensity = INTENSITIES.includes(req.body?.intensity)
      ? req.body.intensity
      : "Focused";
    const notes = cleanText(req.body?.notes, 500);
    if (!workout) throw new HttpError(400, "Workout type is required");
    if (!duration) throw new HttpError(400, "Duration is required (HH:MM)");

    const exists = await User.exists({ name });
    if (!exists) throw new HttpError(404, "User not found");

    const [y, m, d] = dateKey.split("-").map(Number);
    const time = dateKey === todayKey ? new Date() : new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
    const entry = { workout, duration, intensity, notes, dateKey, time };

    const updated = await User.updateOne(
      { name, "entries.dateKey": dateKey },
      { $set: { "entries.$": entry } }
    );
    if (!updated.matchedCount) {
      await User.updateOne(
        { name, "entries.dateKey": { $ne: dateKey } },
        { $push: { entries: { $each: [entry], $position: 0 } } }
      );
    }

    res.json({ user: await refreshStats(name), entry });
  })
);

app.delete(
  "/api/users/:name/entries/:dateKey",
  asyncHandler(async (req, res) => {
    const { name, dateKey } = req.params;
    if (!DATE_KEY_RE.test(dateKey)) throw new HttpError(400, "Invalid date");
    const exists = await User.exists({ name });
    if (!exists) throw new HttpError(404, "User not found");
    await User.updateOne({ name }, { $pull: { entries: { dateKey } } });
    res.json({ user: await refreshStats(name) });
  })
);

app.get(
  "/api/messages",
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - MESSAGE_TTL_SECONDS * 1000);
    const messages = await Message.find({ createdAt: { $gte: since } })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    res.json(messages.map(formatMessage));
  })
);

app.post(
  "/api/messages",
  asyncHandler(async (req, res) => {
    const user = cleanText(req.body?.user, 40);
    const text = cleanText(req.body?.text, 500);
    if (!user || !text) throw new HttpError(400, "User and text are required");
    const known = await User.exists({ name: user });
    if (!known) throw new HttpError(400, "Unknown user");
    const message = await Message.create({ user, text });
    res.status(201).json(formatMessage(message));
  })
);

/* ---------- push notifications ---------- */

app.get("/api/push/public-key", (_req, res) => {
  if (!PUSH_ENABLED) return res.status(503).json({ error: "Push is not configured" });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post(
  "/api/push/subscribe",
  asyncHandler(async (req, res) => {
    if (!PUSH_ENABLED) throw new HttpError(503, "Push is not configured");
    const user = cleanText(req.body?.user, 40);
    const sub = req.body?.subscription;
    if (!user || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      throw new HttpError(400, "User and subscription are required");
    }
    const known = await User.exists({ name: user });
    if (!known) throw new HttpError(400, "Unknown user");
    await PushSubscription.updateOne(
      { endpoint: sub.endpoint },
      {
        $set: {
          user,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          userAgent: cleanText(req.headers["user-agent"], 200),
          failures: 0
        }
      },
      { upsert: true }
    );
    res.json({ ok: true });
  })
);

app.post(
  "/api/push/unsubscribe",
  asyncHandler(async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (!endpoint) throw new HttpError(400, "Endpoint is required");
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  })
);

const sendToSubscription = async (sub, payload) => {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6 }
    );
    await PushSubscription.updateOne(
      { endpoint: sub.endpoint },
      { $set: { lastSentAt: new Date(), failures: 0 } }
    );
    return "sent";
  } catch (error) {
    const status = error?.statusCode;
    if (status === 404 || status === 410) {
      await PushSubscription.deleteOne({ endpoint: sub.endpoint });
      return "expired";
    }
    await PushSubscription.updateOne(
      { endpoint: sub.endpoint },
      { $inc: { failures: 1 } }
    );
    console.error("Push failed", status, error?.body || error?.message);
    return "failed";
  }
};

app.post(
  "/api/push/test",
  asyncHandler(async (req, res) => {
    if (!PUSH_ENABLED) throw new HttpError(503, "Push is not configured");
    const user = cleanText(req.body?.user, 40);
    const endpoint = req.body?.endpoint;
    const filter = endpoint ? { endpoint } : { user };
    if (!endpoint && !user) throw new HttpError(400, "User is required");
    const subs = await PushSubscription.find(filter).lean();
    if (!subs.length) throw new HttpError(404, "No devices are subscribed yet");
    const results = await Promise.all(
      subs.map((sub) =>
        sendToSubscription(sub, {
          title: "FitQuest reminders are on",
          body: `Hey ${user || sub.user}, this device will get your daily check-in nudge.`,
          url: "/",
          tag: "fitquest-test"
        })
      )
    );
    res.json({ ok: true, results });
  })
);

const isCronAuthorized = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.authorization || "";
  return header === `Bearer ${secret}` || req.query.key === secret;
};

const remindHandler = asyncHandler(async (req, res) => {
  if (!isCronAuthorized(req)) throw new HttpError(401, "Unauthorized");
  if (!PUSH_ENABLED) return res.json({ ok: false, reason: "push not configured" });

  const todayKey = dateKeyInTz();
  const force = req.query.force === "1";
  const users = await User.find().lean();
  const summary = [];

  for (const user of users) {
    const loggedToday = (user.entries || []).some((entry) => entry.dateKey === todayKey);
    if (loggedToday && !force) {
      summary.push({ user: user.name, skipped: "already logged" });
      continue;
    }
    const subs = await PushSubscription.find({ user: user.name }).lean();
    if (!subs.length) {
      summary.push({ user: user.name, skipped: "no devices" });
      continue;
    }
    const stats = computeStats(user.entries || [], todayKey);
    const streakNote = stats.streak > 0
      ? `Your ${stats.streak}-day streak is on the line.`
      : "Start a new streak today.";
    const results = await Promise.all(
      subs.map((sub) =>
        sendToSubscription(sub, {
          title: `${user.name}, did you move today?`,
          body: `No workout logged yet for today. ${streakNote}`,
          url: "/?log=today",
          tag: `fitquest-remind-${todayKey}`
        })
      )
    );
    summary.push({ user: user.name, results });
  }

  res.json({ ok: true, today: todayKey, summary });
});

app.get("/api/cron/remind", remindHandler);
app.post("/api/cron/remind", remindHandler);

/* ---------- errors ---------- */

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error("API error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export { app };
export default app;
