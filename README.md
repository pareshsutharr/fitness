# FitQuest Arcade

A small squad workout tracker. Three friends log one workout per day, keep streaks alive, compare on a leaderboard, chat, and get a push reminder in the evening if they have not checked in yet.

Live: https://fitness-five-neon.vercel.app

## Features

- **Today card** with one-tap logging, current streak and who in the squad has checked in.
- **Stats**: current and longest streak, this week, this month, this year.
- **Leaderboard** by days logged this year, with monthly count and streak.
- **Consistency heatmap** for the whole year, per person.
- **Calendar** with month navigation, hit rate and top workouts; tap a past day to log or fix it.
- **Squad chat** (messages expire after 7 days).
- **Profile**: pick "This is me", turn on daily reminders, achievements, theme.
- **Push reminders**: daily at 8:00 PM IST to every device of a person who has not logged that day.
- Installable PWA (Add to Home Screen). On iPhone the app must be installed before reminders can be enabled.

## Stack

- React 18 + Vite frontend (`src/`)
- Express + Mongoose API (`server/app.js`), deployed as Vercel serverless functions via `api/`
- MongoDB Atlas
- `web-push` for VAPID push notifications, triggered by a Vercel Cron job (`vercel.json`)

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/users` | All users with entries, plus the server's idea of today |
| PUT | `/api/users/:name/entries/:dateKey` | Create or update one workout for one day |
| DELETE | `/api/users/:name/entries/:dateKey` | Remove one workout |
| GET / POST | `/api/messages` | Squad chat |
| GET | `/api/push/public-key` | VAPID public key for the browser |
| POST | `/api/push/subscribe` / `unsubscribe` / `test` | Manage a device's push subscription |
| GET | `/api/cron/remind` | Sends reminders; protected by `CRON_SECRET` |

Writes are always scoped to one user and one day. The old bulk `PUT /api/users` that replaced every user document is intentionally gone: a single stale browser tab could (and once did) erase all history with it.

## Local development

```bash
cp .env.example .env   # fill in MONGODB_URI and the VAPID keys
npm install
npm run dev            # API on :4000, Vite on :5173 (proxies /api)
```

Generate VAPID keys with `npx web-push generate-vapid-keys`. Reminders need HTTPS or `localhost`.

## Environment variables

`MONGODB_URI`, `MONGODB_DB` (default `fitness`), `APP_TZ` (default `Asia/Kolkata`), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.

## Scripts

- `npm run dev` – API + Vite with hot reload
- `npm run build` – production build to `dist/`
- `node scripts/make-icons.mjs` – regenerate PWA icons
