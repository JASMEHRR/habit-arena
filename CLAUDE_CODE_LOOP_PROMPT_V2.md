# Habit Arena — V2 Build Prompt for Claude Code (UI-heavy, gamified, group competition)

You are working inside the existing `habit-arena` project (Vite + React, Supabase backend already wired via `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; schema in `supabase/schema.sql`). Rebuild it into a **polished, motivating, group habit-competition web app**. This is a UI/UX-first task — the app must look and feel like a modern habit app (think Habitica, Streaks, Habitify, Cohorty), not a spreadsheet.

Work in a loop: build a slice, run `npm run build`, fix errors, then continue. Do not stop until every item in "Definition of Done" is met.

> The user may paste SCREENSHOTS of reference apps. If screenshots are present in the conversation, treat their layout, spacing, iconography, and color choices as the visual target and match that feel. If none are given, use the design direction below.

## 1. What the product is
Multiple friends (unlimited, join via one invite link) compete on daily-life habits. Every completed habit = points. Good habits earn points; bad habits can reward avoidance or penalize doing them. A **sleep/health "Bank"** tracks debt when you fall short of healthy targets. A live group leaderboard, streaks, progress rings, and infographics make people want to out-do each other.

## 2. Fixed decisions (do NOT re-ask)
- Group size: **unlimited players per room**, all via invite link. Leaderboard scrolls.
- Bank: **both a visual debt meter AND a real weekly-score penalty** (see §5).
- Backend: Supabase (already connected). Real-time so all members' scores/leaderboard update live.
- No passwords. Join a room by entering a display name + picking an avatar/emoji; persist player id in localStorage.

## 3. Preset "daily necessities" (ship these built-in, each with an icon)
Every new player starts with these as quick-add toggles (they can keep, remove, or edit points). Give each a distinct icon (use `lucide-react`, already fine to add, or emoji fallback):
- 😴 Sleep (target hours, default 8) — feeds the Bank
- 🪥 Brush teeth (morning + night)
- 🚿 Shower / bathe
- 💧 Drink water (target glasses, default 8)
- 🏃 Exercise / move
- 🥗 Eat healthy / no junk (can be set as a bad habit to avoid)
- 📵 No doomscrolling / screen limit (bad habit, avoid)
- ☀️ Wake up early
- 📓 Journaling
- 📖 Read a book
- 🧘 Meditate
- 🧹 Tidy space
Provide an **icon map** in code (`src/icons.js`) that maps common habit keywords → an icon (journaling→book, read→book-open, water→droplet, sleep→moon, exercise→dumbbell, meditate→lotus/flower, etc.), and auto-assign an icon when the user types a custom habit whose label matches a keyword. Fall back to a generic icon otherwise, and let the user pick from an icon picker.

## 4. Habit setup (per player)
In-app form. Each habit: label; auto-suggested icon (editable via icon picker); good/bad; if good → point value (suggested, editable); if bad → mode (`reward_avoid` / `penalty_do` / `both`) + points. Include the presets above as one-tap quick-adds. Suggest point values by difficulty heuristic (exercise=5, wake early=4, sleep=4, water=2, no junk=4, journaling=3, read=3).

## 5. The Bank (sleep/health debt) — build exactly this
- Each habit that has a numeric healthy target (sleep hours, water glasses) can contribute to the Bank.
- If the player logs BELOW target, the shortfall goes into their Bank as debt (e.g. slept 6h, target 8h → +2h debt). Show it as a **filling meter / progress bar** that visually rises as debt grows (red as it fills).
- Debt can be **repaid**: exceeding target on a later day (e.g. sleeping 9h when target 8) subtracts 1h from the Bank.
- At week end, any **unpaid debt subtracts from the weekly score** (e.g. each unit of debt = −1 point) and, if the app's rule is on, the next week starts negative by that amount.
- Show the Bank prominently with a label like "Sleep Debt: 4h" and a meter. Put the scoring logic in `src/bank.js` with unit tests.

## 6. UI / UX requirements (this is the priority)
Design direction: clean, modern, dark theme with vibrant accent gradients, rounded cards, soft shadows, generous spacing, smooth transitions. Mobile-first, responsive.

Must include:
- **Top bar (always visible):** the player's **total points counter** AND a separate **weekly points counter**, plus current **streak** (🔥 with day count). Animate the number when it changes.
- **Progress ring / bar** for "today's completion" (earned vs max possible today), like an Apple-Watch-style ring.
- **Group leaderboard:** every member listed with avatar, name, weekly score, streak, and a rank medal (🥇🥈🥉). Highlight the current user. Updates live. Show a "you are #N of M" line.
- **Habit cards** with the habit's icon, a satisfying check/tick animation, and the points earned floating up (+3) on completion.
- **Infographics / stats section:** a weekly bar chart of points per day, a completion-rate donut, streak calendar (heatmap of done days), and a "best habit / most-missed habit" callout. Use a lightweight chart lib (recharts or Chart.js) or hand-rolled SVG.
- **The Bank meter** (see §5) shown near the top stats.
- **Invite:** big "Invite friends" button that copies the room link; a small avatars row showing who's in the room.
- **Motivation:** a rotating motivational line, and celebratory micro-interactions (confetti on hitting 100% for the day or beating your rival). Keep it tasteful, not noisy.
- Empty states, loading skeletons, and friendly copy for a non-technical beginner.

Borrow proven ideas from leading apps: streaks + freeze/grace day (Streaks/Duolingo), XP/levels and challenges (Habitica), group accountability leaderboard (Cohorty), clean stat dashboards (Habitify). You may add: per-day streaks, weekly challenges ("who reads 5 days this week"), and level-up on point milestones.

### Habit card style — match this reference (Loop Habit Tracker look)
The user provided a screenshot to copy the card feel from. Build habit cards as:
- A solid **colored block card** (one accent color per habit; let the user pick the color, default to a palette), title in bold, a short **description line** under it (e.g. "Jogging once a day on weekdays."), and the **completion count top-right** (e.g. `0/1`, `0/3`).
- When a habit's target is more than its minimum, show a **`+`** next to the count (like `0/1 +`) so the user can log extra reps beyond target.
- A **dot-history strip** along the bottom of each card: one dot per recent day (~last 20 days). Filled/solid dot = completed that day, hollow/outline dot = missed or not-yet. This gives an at-a-glance streak view right on the card. Make it responsive (show fewer dots on narrow screens).
- Keep it minimal and high-contrast like the reference, but still support the icons, tick animation, and floating points from the list above.

### Group chat (build this)
Add a **group chat** so everyone in the room can talk trash / cheer each other on:
- A chat panel (side drawer on desktop, bottom sheet / tab on mobile) scoped to the room.
- Messages show sender avatar + name + text + timestamp; auto-scroll to newest; live via Supabase Realtime.
- Add a `messages` table to `supabase/schema.sql`: id, room_id (fk), player_id (fk), body (text), created_at. Enable the same permissive anon RLS + add it to the realtime publication.
- Support lightweight **system messages** posted automatically on notable events (someone hits a 7-day streak, takes #1 on the leaderboard, or clears their whole day) — e.g. "🔥 Aman just hit a 7-day streak!". Keep these tasteful.
- Basic niceties: emoji support, enter-to-send, unread indicator when the panel is closed.

## 7. Data / realtime
Use the existing schema; extend it if needed (add columns/tables via new SQL you also write into `supabase/schema.sql`, e.g. avatar, streak, target values, bank_debt). Subscribe to Supabase Realtime so leaderboard and all counters update across browsers without refresh. Keep all secrets in `.env`.

## 8. Definition of Done (loop until ALL true)
- [ ] `npm run build` succeeds, no errors.
- [ ] Unlimited players can join one room via invite link; leaderboard shows all, live-updating, with ranks/medals.
- [ ] All preset daily-necessity habits ship built-in, each with an icon; custom habits auto-get a matching icon.
- [ ] Top bar shows animated total points, weekly points, and streak at all times.
- [ ] Today's progress ring, weekly bar chart, completion donut, and streak heatmap all render with real data.
- [ ] Good/bad habits and all 3 bad-habit modes work; points suggested + editable.
- [ ] The Bank meter fills with debt, allows repayment, and its unpaid debt penalizes weekly score. `src/bank.js` tests pass.
- [ ] Check-off has a tick animation + floating points; day-100% triggers a celebratory moment.
- [ ] Habit cards match the reference: colored block, title + description, `count/target` (with `+` for extra), and a dot-history strip showing recent done/missed days.
- [ ] Group chat works: room-scoped, live messages with avatar/name/timestamp, auto system messages on streaks/rank changes, unread indicator. `messages` table added to schema + realtime.
- [ ] Fully responsive on mobile; dark theme, rounded cards, smooth transitions; no raw spreadsheet look.
- [ ] Scoring logic in `src/scoring.js` + `src/bank.js` has passing node unit tests (good, all bad modes, bank debt/repay, daily max).
- [ ] README updated: run locally, env vars, Supabase setup recap, Vercel deploy + env vars in Vercel settings.

## 9. Working rules
- UI quality is judged first — if it looks plain, keep iterating before calling it done.
- After each slice: `npm run build` + run the scoring/bank tests; fix before moving on.
- Small, readable components; comment anything non-obvious for a beginner.
- Never commit real keys. When done, print a short plain-English "what to do next" (test it, then deploy).
```
