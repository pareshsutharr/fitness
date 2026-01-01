import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const MESSAGE_TTL_SECONDS = 7 * 24 * 60 * 60;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env");
  process.exit(1);
}

const app = express();
app.use(express.json());

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

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
  createdAt: {
    type: Date,
    default: Date.now,
    expires: MESSAGE_TTL_SECONDS
  }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

const defaultUsers = [
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

const formatUser = (doc) => {
  const { _id, __v, ...rest } = doc;
  return rest;
};

const formatMessage = (doc) => ({
  id: doc._id.toString(),
  user: doc.user,
  text: doc.text,
  time: doc.createdAt
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/users", asyncHandler(async (_req, res) => {
  const users = await User.find().lean();
  if (!users.length) {
    await User.insertMany(defaultUsers);
    const seeded = await User.find().lean();
    return res.json(seeded.map(formatUser));
  }
  return res.json(users.map(formatUser));
}));

app.put("/api/users", asyncHandler(async (req, res) => {
  const incoming = Array.isArray(req.body)
    ? req.body
    : req.body?.users;
  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: "Users array required" });
  }

  const ops = incoming
    .filter((user) => user?.name)
    .map((user) => ({
      updateOne: {
        filter: { name: user.name },
        update: { $set: user },
        upsert: true
      }
    }));

  if (ops.length) {
    await User.bulkWrite(ops, { ordered: false });
  }

  const users = await User.find().lean();
  return res.json(users.map(formatUser));
}));

app.get("/api/messages", asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - MESSAGE_TTL_SECONDS * 1000);
  const messages = await Message.find({ createdAt: { $gte: since } })
    .sort({ createdAt: 1 })
    .lean();
  res.json(messages.map(formatMessage));
}));

app.post("/api/messages", asyncHandler(async (req, res) => {
  const user = req.body?.user?.trim();
  const text = req.body?.text?.trim();
  if (!user || !text) {
    return res.status(400).json({ error: "User and text are required" });
  }
  const message = await Message.create({ user, text });
  res.status(201).json(formatMessage(message));
}));

app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const start = async () => {
  await mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB || "fitness"
  });
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
