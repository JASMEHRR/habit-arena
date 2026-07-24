# Habit Arena — V3 Restyle Prompt for Claude Code (design-system pass, full app)

You are working inside the existing `habit-arena` project (Vite + React, Supabase wired via `.env`, schema in `supabase/schema.sql`). The app **works**. This task is **purely visual**: the owner's complaint is that it "feels dated" and the "layout/spacing is messy." Fix that across every page without changing behaviour.

Work in a loop: change a slice, run `npm run build`, run the tests, fix errors, continue. Do not stop until every item in "Definition of Done" is met.

> Screenshots of the current login screen may be pasted into the conversation. If reference screenshots of *other* apps are provided, treat their spacing, type scale, and restraint as the visual target.

## 1. Fixed decisions (do NOT re-ask, do NOT undo)

- **The auth/password-reset flow is already built and verified. Do not modify its logic.** Files `src/lib/auth.js`, `src/pages/ResetPassword.jsx`, and the `/reset-password` route in `src/App.jsx` are done. You may restyle them; you may not change what they do.
  - In particular: the `/reset-password` route **must stay above** the `if (!session)` gate in `App.jsx`. Supabase's recovery link establishes a session, so moving it below the gate silently breaks password reset.
  - The 2500ms `LINK_GRACE_MS` timer in `ResetPassword.jsx` is deliberate (Supabase parses the URL token asynchronously). Do not remove it.
- **Keep the dark theme and the red brand accent** (`--indigo: #E50914`). The owner did not ask for a new palette. You may reduce how *heavily* red is used — see §3 — but do not re-hue the brand.
- **Do not touch** `src/scoring.js`, `src/bank.js`, `src/stats.js`, `src/lib/importHabits.js`, or any `*.test.js`. These have passing unit tests and no visual role.
- No new dependencies. `lucide-react`, `recharts`, and `canvas-confetti` are already installed and sufficient.

## 2. Two confirmed bugs to fix first

Both were verified by reading the source — fix these before any cosmetic work, because they're causing the "messy spacing" complaint directly.

**2a. `.field` is a class collision.** `src/styles.css` defines `.field` as a *label wrapper*:

```css
.field { display: flex; flex-direction: column; gap: 7px; color: var(--muted); font-size: 13px; }
.field select, .field input { align-self: flex-start; color: var(--txt); }
```

But `src/pages/Auth.jsx` (and now `ResetPassword.jsx`) put `className="field"` **directly on `<input>` elements**. The inputs therefore inherit wrapper styling by accident — `display:flex`, muted text colour, and 13px font. It renders passably by luck, not design.

Fix: separate the two roles. Introduce a distinct class for a bare styled input (e.g. `.input`) and update the auth pages to use it; leave the wrapper `.field` for the label+control pattern used in `HabitSetup`. Grep for every `className="field"` before you change the CSS — do not assume only the auth pages use it.

**2b. The login left panel has a ~350px dead zone.** `.login-left` uses `justify-content: space-between` and expects three children. `src/pages/Room.jsx` supplies a `.login-stats` block as the third child; `src/pages/Auth.jsx` never got an equivalent, so the brand pins to the top, the hero pins to the bottom, and the middle is empty.

Fix: either give the auth pages a genuine third element (a short feature list, or a stats row in the `.login-stats` style), or change the layout so two children distribute correctly. Do not simply add a spacer div.

## 3. Design system (do this before touching components)

The complaint is spacing and datedness, so most of the win is in `src/styles.css`, not in JSX. Establish a real system at the top of the file and then propagate it.

**Spacing scale.** Define tokens and use them everywhere. Ad-hoc values (`padding: 22px`, `margin-bottom: 18px`, `gap: 7px`, `margin: 20px 0`) are scattered through the file — that inconsistency *is* the mess.

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-5: 24px;  --space-6: 32px;
--space-7: 48px; --space-8: 64px;
```

Replace hardcoded spacing with these. Nothing should sit off-scale without a comment justifying it.

**Type ramp.** Font sizes currently range across 11, 12, 12.5, 13, 13px, 14, 15, 16, 18, 19, 20, 22, 24, 26, 30, 36px with no logic. Collapse to a ramp of about six steps and apply consistently.

**Restraint pass.** The current look reads dated mainly because effects are stacked indiscriminately: nearly every surface has `backdrop-filter: blur(20px) saturate(135%)`, a triple `box-shadow`, a gradient border highlight, *and* red glow. Modern dark UI is more restrained.
- Reserve the heavy red glow (`box-shadow: 0 8px 22px rgba(229,9,20,0.45)`) for the single primary action on screen. Secondary buttons get no glow.
- Reduce glass blur on large surfaces; keep it for genuinely floating elements.
- Cap shadow layers at two per element.

**Focus states.** Keep `:focus-visible` outlines on every interactive element. Do not remove them in the name of cleanliness — that's an accessibility regression.

## 4. Per-surface work

Investigate each file before editing it — do not assume its contents.

- **`src/pages/Auth.jsx` + `ResetPassword.jsx`** — fix §2a and §2b. Make button widths consistent (currently "Sign in →" is hug-width while "Create a new account" is full-width, which reads as a hierarchy error). Vertically centre the right panel so it doesn't jump when toggling sign-in / sign-up / forgot. The avatar grid wraps 5/5/4 leaving a ragged orphan row — pick a column count that divides 14 evenly, or make it scrollable.
- **`src/pages/Landing.jsx`** — rooms list. Apply the spacing scale; give it a real empty state if it lacks one.
- **`src/pages/Room.jsx`** — the main surface. Densest layout; most spacing wins live here.
- **Components** — `HabitCard`, `Leaderboard`, `PlayerColumn`, `StatsPanel`, `BankMeter`, `PointsLedger`, `ChatPanel`, `ProgressRing`, `AnimatedNumber`, `HabitSetup`, `ImportHabits`, `CopyHabits`. Prefer CSS-only changes. Touch JSX only where CSS genuinely cannot reach (e.g. a wrapper element is missing).
- **Responsive** — existing breakpoints are 480 / 760 / 860 / 900px. Consolidate to a consistent set and verify each page at 375px, 768px, and 1440px.

## 5. Working rules

- **Smallest diff that achieves the look.** No drive-by refactoring, no reformatting untouched code, no renaming things that already work.
- After each slice: `npm run build`, then `npm test`. Both must pass before moving on.
- If a CSS change requires a JSX change, say so explicitly in your summary rather than making it silently.
- Comment anything non-obvious — the owner is still learning the technical side.
- Never commit real keys. Confirm `.env` is gitignored before any commit.

## 6. Definition of Done (loop until ALL true)

- [ ] `npm run build` succeeds with no errors or warnings.
- [ ] `npm test` passes (scoring, bank, importHabits, stats — all four suites).
- [ ] The `.field` collision is resolved; no `<input>` inherits label-wrapper styling; every former usage site still renders correctly.
- [ ] The login left-panel dead zone is gone; brand and hero sit in a deliberate composition on **both** `Auth.jsx` and `ResetPassword.jsx`.
- [ ] A spacing scale and type ramp exist as CSS custom properties and are used throughout `styles.css`; no unexplained off-scale values remain.
- [ ] Heavy red glow appears on at most one primary action per screen.
- [ ] Auth panel does not shift vertically when toggling sign-in / sign-up / forgot password.
- [ ] Every page verified at 375px, 768px, and 1440px with no overflow, no clipped text, no overlapping elements.
- [ ] `:focus-visible` styling intact on all interactive elements; keyboard tab order sane on the auth pages.
- [ ] Password reset still works end to end: "Forgot password?" → email field → `/reset-password` renders its form → new password saves. **Confirm the `/reset-password` route still sits above the session gate in `App.jsx`.**
- [ ] No new dependencies in `package.json`.
- [ ] Print a short plain-English summary of what changed visually and what the owner should click to check it.

## 7. Out of scope

Do not add features. No new pages, no new habit mechanics, no schema changes, no copy rewrites beyond what a layout change forces. If you believe a feature is needed to fix the look, stop and ask first.
