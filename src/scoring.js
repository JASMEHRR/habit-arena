// Habit Arena — pure scoring functions (no React, no Supabase).
// Kept dependency-free so the tests can run with plain `node`.
//
// Habit shape: { id, label, kind: 'good' | 'bad', points, bad_mode, penalty_if_skipped }
//   good habit                          -> earn `points` when done, else 0
//                                          (or lose `points` if penalty_if_skipped,
//                                          used for mandatory habits — see rooms.js).
//   bad habit 'reward_avoid'            -> earn `points` when explicitly logged avoided.
//   bad habit 'penalty_do'              -> lose `points` when done, else 0.
//   bad habit 'both'                    -> earn when logged avoided, lose when done.
//
// `done` means: good habit completed, OR the bad thing was actually done.

// Today's date as 'YYYY-MM-DD' in the user's local timezone.
export function todayStr(d = new Date()) {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

// Array of the last `n` date strings ending today (ascending, oldest first).
export function lastNDays(n, endStr = todayStr()) {
  const out = []
  const end = new Date(endStr + 'T00:00:00')
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    out.push(todayStr(d))
  }
  return out
}

// Points a single habit contributes given whether it was "done" today.
// `logged` = an entry actually exists for today. It only gates the "avoided"
// credit on bad habits (reward_avoid/both) — without it, that credit would be
// earned for free on any day you never opened the app and touched the habit
// at all. Good habits are unaffected: "not done" is already the correct,
// unambiguous default (including the penalty on a skipped mandatory habit —
// there's no free pass for silence there either, by design).
export function habitPoints(habit, done, logged = true) {
  const p = habit.points || 0
  if (habit.kind === 'good') {
    if (done) return p
    return habit.penalty_if_skipped ? -p : 0
  }
  // bad habit
  switch (habit.bad_mode) {
    case 'reward_avoid':
      if (done) return 0
      return logged ? p : 0
    case 'penalty_do':
      return done ? -p : 0
    case 'both':
      if (done) return -p
      return logged ? p : 0
    default:
      return 0
  }
}

// Best-case positive total for today (used as the progress bar's denominator).
// penalty_do habits can never add points, so they contribute 0 to the max.
export function dailyMax(habits) {
  let max = 0
  for (const h of habits) {
    if (h.kind === 'good') max += h.points || 0
    else if (h.bad_mode === 'reward_avoid' || h.bad_mode === 'both') max += h.points || 0
    // penalty_do contributes 0
  }
  return max
}

// A player's total score today. `doneByHabitId`/`loggedByHabitId` map
// habitId -> boolean. `loggedByHabitId` is optional for callers that already
// know every habit is logged (e.g. tests); omitted, everything counts.
export function playerScore(habits, doneByHabitId = {}, loggedByHabitId = null) {
  let total = 0
  for (const h of habits) {
    const logged = loggedByHabitId ? !!loggedByHabitId[h.id] : true
    total += habitPoints(h, !!doneByHabitId[h.id], logged)
  }
  return total
}

// Progress bar width as a 0..100 percentage. Negative/over is clamped;
// the real (possibly negative) score is displayed separately.
export function progressPercent(earned, max) {
  if (max <= 0) return 0
  const pct = (earned / max) * 100
  return Math.max(0, Math.min(100, pct))
}
