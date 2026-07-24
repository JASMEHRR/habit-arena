# 🏆 Habit Arena

A **gamified group habit-competition app**. Invite unlimited friends to one
room via a link; everyone sets up their own daily habits and competes on a live
leaderboard. Good habits earn points; bad habits reward avoidance or penalize
slips. A **Bank** tracks sleep/health debt, and a stats dashboard, streaks,
progress rings, Loop-style habit cards, and a group chat keep it motivating.

Built with Vite + React and a free [Supabase](https://supabase.com) backend.

### Features
- **Unlimited players per room**, live leaderboard with medals, avatars, and streaks.
- **Preset daily-necessity habits** (sleep, water, brush, shower, exercise, no
  doomscrolling, wake early, journal, read, meditate, tidy) — each with an icon.
  Custom habits auto-get a matching icon; pick your own icon + color.
- **Loop-style habit cards**: colored block, icon, description, `count/target`
  with `+` for extra reps, a dot-history strip, tick animation + floating points.
- **Top bar** with animated total points, weekly points, and 🔥 streak.
- **Today ring**, weekly bar chart, completion donut, and 30-day heatmap.
- **The Bank**: fall short of a target (e.g. sleep 8h) and it banks as debt;
  exceed later to repay; unpaid debt costs weekly points.
- **Group chat** with live messages, avatars, and auto system messages on
  streaks / clearing your day. Confetti when you hit 100%.

> **Upgrading from V1?** Re-run `supabase/schema.sql` in the Supabase SQL editor
> — the V2 additions use `add column if not exists` / `create table if not
> exists`, so it's safe to run over your existing database.

---

## What you need

- [Node.js](https://nodejs.org) installed (v18+).
- A free Supabase account (no credit card needed).

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New project**. Give it a name and a database password (any strong
   password — you won't need it in this app). Pick the free plan and a region.
3. Wait a minute for it to finish setting up.

## 2. Create the database tables

1. In your project, open the **SQL Editor** (left sidebar) → **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this repo,
   copy **everything**, paste it into the editor, and click **Run**.
3. This creates the four tables (`rooms`, `players`, `habits`, `entries`),
   turns on Row Level Security with open policies (fine for a casual game with
   no logins), and enables Realtime so scores update live.

## 3. Fill in your `.env`

1. In Supabase, go to **Project Settings → API**. Copy your **Project URL** and
   your **anon / public** API key.
2. In this project folder, copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Paste your values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   > The `.env` file is git-ignored so your keys never get committed. The anon
   > key is designed to be used in the browser — it's safe with the open
   > policies above for a non-sensitive app like this.

## 4. Run it locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

- Click **Start a competition** → you become player 1 and get an invite link.
- Set up your habits. Open the **invite link in a second browser window**
  (or send it to your friend) and join as player 2.
- Tick habits in each window — both progress bars and scores update in real
  time in the other window too.

## Run the scoring tests

The scoring rules (good habits, all three bad-habit modes, daily-max for the
progress bar) live in `src/scoring.js` with plain-Node tests:

```bash
npm test
```

## 5. Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects Vite (build command `npm run build`, output `dist`).
4. **Important — add your environment variables:** before deploying, open
   **Settings → Environment Variables** (or the "Environment Variables" section
   in the import screen) and add both:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   with the same values as your local `.env`. Without these the deployed app
   can't reach Supabase.
5. Click **Deploy**. You'll get a live URL to share. The included `vercel.json`
   makes invite links like `/room/ABC123` work on refresh.

---

## How scoring works

Each habit you tick counts toward your daily score:

| Habit | When you tick it (you did it) | When you leave it (you didn't) |
|-------|-------------------------------|--------------------------------|
| Good | **+points** | 0 |
| Bad — *reward for avoiding* | 0 | **+points** |
| Bad — *penalty for doing* | **−points** | 0 |
| Bad — *both* | **−points** | **+points** |

The progress bar shows today's earned points vs the best possible total for
that player (bad "penalty only" habits don't raise the max, since avoiding them
just means no loss).

## Project structure

- `src/scoring.js` — pure scoring functions (+ `src/scoring.test.js`).
- `src/supabaseClient.js` — the Supabase client, configured from `.env`.
- `src/lib/rooms.js` — all database calls (create/join room, habits, entries, realtime).
- `src/pages/Landing.jsx` — home / create-a-room screen.
- `src/pages/Room.jsx` — the shared room: join flow, invite link, live board.
- `src/components/HabitSetup.jsx` — add-habit form with suggested points.
- `src/components/PlayerColumn.jsx` — one player's progress bar + habits.
- `supabase/schema.sql` — the database schema to paste into Supabase.
