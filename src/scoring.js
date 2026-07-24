// Habit Arena — pure scoring functions (no React, no Supabase).
// Kept dependency-free so the tests can run with plain `node`.
//
// Habit shape: { id, label, kind: 'good' | 'bad', points, bad_mode }
//   good habit                -> earn `points` when done.
//   bad habit 'reward_avoid'  -> earn `points` when NOT done (avoided).
//   bad habit 'penalty_do'    -> lose `points` when done, else 0.
//   bad habit 'both'          -> earn when avoided, lose when done.
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
export function habitPoints(habit, done) {
  const p = habit.points || 0
  if (habit.kind === 'good') return done ? p : 0
  // bad habit
  switch (habit.bad_mode) {
    case 'reward_avoid':
      return done ? 0 : p
    case 'penalty_do':
      return done ? -p : 0
    case 'both':
      return done ? -p : p
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

// A player's total score today. `doneByHabitId` maps habitId -> boolean.
export function playerScore(habits, doneByHabitId = {}) {
  let total = 0
  for (const h of habits) total += habitPoints(h, !!doneByHabitId[h.id])
  return total
}

// Progress bar width as a 0..100 percentage. Negative/over is clamped;
// the real (possibly negative) score is displayed separately.
export function progressPercent(earned, max) {
  if (max <= 0) return 0
  const pct = (earned / max) * 100
  return Math.max(0, Math.min(100, pct))
}
