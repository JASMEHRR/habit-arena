# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small groups of friends in their early twenties who already know each other —
there is no cold acquisition. One person creates a room and shares an invite
link into a group chat; everyone else arrives already knowing what it is and who
is in it.

The primary situation is **a phone, in hand, late at night or first thing in the
morning**: recording whether they actually slept on time, drank water, brushed,
exercised, didn't doomscroll — and checking whether a friend has pulled ahead.
Confirmed by the user: phone is the primary device; desktop is secondary.

The job: keep a daily habit honestly, because someone you know is watching the
same board.

## Product Purpose

A shared daily scoreboard for ordinary habits. Each player sets up their own
habits inside one room; ticking them scores points; a live leaderboard ranks
everyone in the room.

Success is a room where friends keep logging past the first week — which means
the daily log has to be faster and more satisfying than not bothering, and the
standings have to be worth checking.

Confirmed positioning intent: mostly private in practice, but the first screen
should read as a real product rather than a developer prototype.

## Positioning

Three mechanisms a neighbouring habit tracker could not truthfully copy:

1. **One room, many players, one board.** Habits are private to each player but
   the score is public to the room. It is not a solo tracker with social
   features bolted on; the room is the unit.
2. **An equal daily point budget.** Every player's day maxes out at the same
   total (`DAILY_POINT_TARGET = 30`), made of three mandatory habits every player
   gets (brush teeth, drink water, sleep on time — 5 points each) plus a 15-point
   budget for whatever else they choose. So you cannot win by adding more habits
   than your friends; you win by actually doing yours.
3. **The Bank: shortfall carries forward as debt.** Missing a target (e.g. sleep
   8h) banks the gap as debt rather than resetting to zero; exceeding later
   repays it, and unpaid debt costs weekly points. Habits compound instead of
   being forgiven each midnight.

## Operating Context

- Rooms are joined by a 6-character invite code in a URL (`/room/ABC123`),
  shared into a group chat. Codes deliberately exclude `0/O/1/I`.
- Logging is a daily ritual, usually once or twice a day, taking seconds. Any
  friction in the tick is the product's main failure mode.
- Players are in more than one room over time; there is a group switcher and a
  "copy my habits from another room" path.
- Scores propagate live between players' devices (Supabase Realtime), so two
  friends can be looking at the same board at the same moment.
- Rooms can be recovered by email if a player loses access.

## Capabilities and Constraints

**Confirmed capabilities** (all preserved by any redesign):

- Email/password auth with sign-up, sign-in, password reset by emailed link, and
  password change (`src/lib/auth.js`).
- Create room, join by code, leave room, delete room, list my rooms, claim old
  rooms by email, copy habits from another room (`src/lib/rooms.js`).
- Habits: three kinds — good, bad, and counter/target habits with a unit. Bad
  habits have three modes (reward for avoiding, penalty for doing, both). Each
  habit has a lucide icon (auto-matched from its label by keyword) and a colour.
  Three habits are mandatory and seeded on join.
- Entries: per habit, per day, with a numeric value and a target.
- Scoring, streaks, weekly series, 30-day completion rate, heatmap, best/most-
  missed callouts, and level — all pure functions in `src/scoring.js`,
  `src/bank.js`, `src/stats.js`, each with plain-Node tests.
- Per-room group chat with automatic system messages on streaks and cleared days.
- 30 days of history is loaded (`HISTORY_DAYS = 30`).

**Technical constraints:**

- Vite + React 18, react-router-dom 7, plain CSS (no framework, no CSS-in-JS).
- Supabase (Postgres + Auth + Realtime) on the free tier, browser anon key only;
  no server of our own, so no server-rendered pages and no secret-holding code.
- Deployed as a static build on Vercel; `vercel.json` rewrites make
  `/room/:code` survive a refresh, so client-side routes are safe to add.
- recharts and canvas-confetti are already dependencies.
- `npm test` runs four plain-Node test files and must stay green.

**Terminology:** *room* (the shared competition), *player* (one person in a
room), *habit*, *entry* (one habit on one day), *the Bank* (accumulated
shortfall debt), *points*, *streak*.

**Explicitly undecided:** whether the product is ever publicly launched; whether
it stays free.

## Brand Commitments

**None.** The user confirmed nothing in the current identity is binding —
including the name "Habit Arena", the red/black palette, the `🏆` mark, the 14
emoji avatars, the Russo One display face, and the confetti. The existing look is
evidence of what the product is, not authority over what it becomes.

## Evidence on Hand

- A working application with real scoring logic and a real database schema
  (`supabase/schema.sql`).
- Real product mechanics that can be demonstrated rather than claimed: the equal
  30-point budget, the three bad-habit modes, the Bank's debt carry-forward.

**Absences that must not be fabricated:** there are no users beyond the user's
own circle, no testimonials, no press, no case studies, no benchmarks, no
pricing, and no usage numbers. The current `Auth.jsx` and `ResetPassword.jsx`
display three invented marketing stat tiles; these are fabrications and are being
removed, not restyled. Any player names, habits, or scores used as demonstration
material must be labelled synthetic.

## Product Principles

1. **The tick is the product.** Logging today's habits must be the fastest,
   most reachable thing on the screen, on a phone, one-handed. Everything else is
   secondary to that one interaction.
2. **The score is social or it is nothing.** Where you stand relative to the
   people you know is the reason to come back. Standings are never buried.
3. **Equal footing, honestly enforced.** The equal point budget is a promise; no
   surface may imply you can win by configuring more.
4. **Debt, not absolution.** The Bank is the product's memory. Shortfall is shown
   as carried forward, never quietly reset.
5. **Claim nothing the product cannot show.** No invented users, numbers, or
   social proof — the mechanics are the demonstration.

## Accessibility & Inclusion

No user-specific requirement was established, so the standard applies: WCAG 2.1
AA. Two known current failures the redesign must fix — `index.html` sets
`maximum-scale=1.0`, which blocks pinch zoom on the primary device, and sixteen
text inputs have no associated label. Touch targets must meet 44px on the phone
surface, and every animation (confetti, count-up tweens, floating point bubbles)
must respect `prefers-reduced-motion`.
