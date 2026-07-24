# Habit Arena — Build Loop Prompt for Claude Code

You are working inside the existing `habit-arena` project (Vite + React, local-first, in this folder). Your job is to rebuild it into a **real two-player competitive habit tracker** with a Supabase backend and shareable invite links. Work in a loop: build a slice, verify it, then move to the next slice. Do not stop until every item in the "Definition of Done" is met. After each slice, run `npm run build` and fix any errors before continuing.

## Product in one sentence
Two people compete on daily habits. Each sets up their own habits through an in-app form (good habits earn points when done; bad habits can reward you for avoiding them, penalize you for doing them, or both). One person creates a room and sends the other an invite link. Both players see a shared page side by side, each with a progress bar at the top, updating live.

## Tech decisions (already made — do not re-ask)
- Frontend: keep Vite + React (existing setup). Plain CSS or lightweight styling; keep the dark theme in `src/styles.css`.
- Backend: **Supabase** (free tier). Use `@supabase/supabase-js`. Read Supabase URL + anon key from `.env` via `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Create a `.env.example` documenting these. Never hardcode keys.
- Real-time: use Supabase Realtime (postgres_changes subscriptions) so both players' progress bars and scores update live without refresh.
- Auth: keep it simple — no passwords. A player joins by entering a display name; store their player id in localStorage so they stay "logged in" on that device. (Do NOT build email/password auth.)

## Data model (Supabase tables)
Design and include SQL migration text in a file `supabase/schema.sql` that the user can paste into the Supabase SQL editor. Suggested tables:
- `rooms`: id (uuid, pk), invite_code (short unique text), created_at.
- `players`: id (uuid, pk), room_id (fk), display_name, joined_at. Enforce max 2 players per room in app logic.
- `habits`: id, player_id (fk), label, kind ('good' | 'bad'), points (int), bad_mode ('reward_avoid' | 'penalty_do' | 'both', null for good), created_at.
- `entries`: id, habit_id (fk), date (YYYY-MM-DD), done (bool), created_at. Unique on (habit_id, date).
Enable Row Level Security with permissive policies for the anon role (this is a casual app, not sensitive data) so it works without server-side auth. Document this clearly.

## Flows to build
1. **Create room**: landing page has "Start a competition". Creates a room + generates a short invite code, adds the creator as player 1, routes to the room. Show a copyable invite link like `/room/<invite_code>`.
2. **Join via link**: opening `/room/<code>` where the visitor isn't already a player prompts for a display name and joins them as player 2 (reject if room already has 2 players).
3. **Habit setup form** (per player, first time in a room): a form to add habits. Each habit row: label; good/bad toggle; if good → point value; if bad → choose bad_mode (reward for avoiding / penalty for doing / both) and point value. **Suggest a point value** based on the label (simple heuristic map of common habits → suggested points, e.g. exercise=5, wake early=4, sleep 8h=4, drink water=2, no junk food (bad)=4) but let the user override every value. Include common preset habits both players likely share (sleep, water, shower, exercise) as quick-add buttons.
4. **Daily tracker (the main shared screen)**: two columns side by side (stack vertically on mobile), one per player. At the top of each column a **progress bar** showing today's earned points vs that player's max possible points for today. Below, each player's habit list with checkboxes for today. Ticking a good habit that's done = +points. For bad habits: reward_avoid → points only if NOT ticked (avoided); penalty_do → negative points if ticked; both → points for avoiding and penalty for doing. Show each player's total score. Updates in real time for both viewers.
5. **Scoring engine**: put pure scoring functions in `src/scoring.js` with unit tests you can run via node. Cover good habits, all three bad-habit modes, and daily-max calculation for the progress bar.

## UI requirements
- Progress bars at the very top, both players visible at once, clearly labeled with names.
- Side-by-side layout on desktop, stacked on mobile.
- Clean, obvious "Copy invite link" button.
- Keep it friendly and simple — the user is a non-technical beginner.

## Definition of Done (loop until ALL true)
- [ ] `npm run build` succeeds with no errors.
- [ ] Supabase client wired via env vars; `.env.example` and `supabase/schema.sql` exist and are documented in README.
- [ ] Create-room, invite-link, and join-as-player-2 flows all work.
- [ ] Habit setup form supports good/bad, suggested+editable points, and per-habit bad-habit mode.
- [ ] Main screen shows both players side by side, each with a live progress bar and score.
- [ ] Ticking habits updates scores and both progress bars in real time across two browser windows.
- [ ] `src/scoring.js` has passing unit tests (good habits, all 3 bad modes, daily max). Run them and show output.
- [ ] README updated with: how to create a free Supabase project, where to paste `schema.sql`, how to fill `.env`, how to run locally, and how to deploy on Vercel (including adding the env vars in Vercel project settings).

## Working rules
- After each slice, run the build and the scoring tests; fix before proceeding.
- Keep secrets in `.env` only. Never commit real keys.
- Prefer small, readable components. Comment anything non-obvious for a beginner.
- When done, print a short plain-English summary of what to do next (Supabase setup steps first).
```
