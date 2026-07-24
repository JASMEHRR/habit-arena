// Habit Arena — derived stats for the UI (pure). Built on scoring.js + bank.js.
import { habitPoints, dailyMax, playerScore } from './scoring.js'
import { bankTotal, bankPenalty } from './bank.js'

const WEEK = 7

export function dayDone(entriesByHabit, habitId, date) {
  return entriesByHabit[habitId]?.[date]?.done || false
}
export function dayValue(entriesByHabit, habitId, date) {
  return entriesByHabit[habitId]?.[date]?.value || 0
}

// { habitId: done } for one day — the shape scoring.playerScore expects.
export function doneMap(habits, entriesByHabit, date) {
  const m = {}
  for (const h of habits) m[h.id] = dayDone(entriesByHabit, h.id, date)
  return m
}

// { habitId: logged } — whether an entry exists at all for that day. A habit
// with no entry contributes 0 either way (see scoring.habitPoints) instead of
// silently earning "avoided" credit for a bad habit no one ever logged.
export function loggedMap(habits, entriesByHabit, date) {
  const m = {}
  for (const h of habits) m[h.id] = entriesByHabit[h.id]?.[date] !== undefined
  return m
}

// Points earned on a single day.
export function dayScore(habits, entriesByHabit, date) {
  return playerScore(habits, doneMap(habits, entriesByHabit, date), loggedMap(habits, entriesByHabit, date))
}

// Today's ring: earned vs best-possible.
export function dayCompletion(habits, entriesByHabit, date) {
  const earned = dayScore(habits, entriesByHabit, date)
  const max = dailyMax(habits)
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (earned / max) * 100))
  return { earned, max, pct }
}

// A day is "complete" when there are habits and every possible point was earned.
export function isFullDay(habits, entriesByHabit, date) {
  const { earned, max } = dayCompletion(habits, entriesByHabit, date)
  return max > 0 && earned >= max
}

// Consecutive complete days ending today (today may still be in progress).
export function streak(habits, entriesByHabit, days) {
  let s = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (isFullDay(habits, entriesByHabit, days[i])) s++
    else if (i === days.length - 1) continue // today not finished yet — keep looking back
    else break
  }
  return s
}

// Daily values per bank habit (chronological) for bank.js. Only days the
// player actually LOGGED count — untracked days never bank phantom debt.
function bankValues(habits, entriesByHabit, days) {
  const out = {}
  for (const h of habits) {
    if (!h.is_bank) continue
    out[h.id] = days
      .filter((d) => entriesByHabit[h.id]?.[d] !== undefined)
      .map((d) => dayValue(entriesByHabit, h.id, d))
  }
  return out
}
export function playerBankDebt(habits, entriesByHabit, days) {
  return bankTotal(habits, bankValues(habits, entriesByHabit, days))
}

// Sum of daily points over a set of days.
export function rangeScore(habits, entriesByHabit, days) {
  return days.reduce((sum, d) => sum + dayScore(habits, entriesByHabit, d), 0)
}

// Weekly score = last 7 days of points minus the current unpaid bank penalty.
export function weekScore(habits, entriesByHabit, days) {
  const week = days.slice(-WEEK)
  const pts = rangeScore(habits, entriesByHabit, week)
  return pts - bankPenalty(playerBankDebt(habits, entriesByHabit, days))
}
export function totalScore(habits, entriesByHabit, days) {
  return rangeScore(habits, entriesByHabit, days)
}

// [{ label, points }] for the last 7 days (for the bar chart).
export function weeklySeries(habits, entriesByHabit, days) {
  return days.slice(-WEEK).map((d) => ({
    label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    date: d,
    points: dayScore(habits, entriesByHabit, d),
  }))
}

// Completion rate over the window: average of daily pct.
export function completionRate(habits, entriesByHabit, days) {
  if (!days.length || !habits.length) return 0
  const sum = days.reduce((s, d) => s + dayCompletion(habits, entriesByHabit, d).pct, 0)
  return Math.round(sum / days.length)
}

// Per-day completion fraction for the heatmap.
export function heatmap(habits, entriesByHabit, days) {
  return days.map((d) => ({ date: d, pct: dayCompletion(habits, entriesByHabit, d).pct }))
}

// Best (most completed) and most-missed good habit over the window.
export function habitCallouts(habits, entriesByHabit, days) {
  const good = habits.filter((h) => h.kind === 'good')
  if (!good.length) return { best: null, missed: null }
  const counts = good.map((h) => ({
    habit: h,
    done: days.filter((d) => dayDone(entriesByHabit, h.id, d)).length,
    total: days.length,
  }))
  const best = counts.reduce((a, b) => (b.done > a.done ? b : a))
  const missed = counts.reduce((a, b) => (b.total - b.done > a.total - a.done ? b : a))
  return { best, missed }
}

// Recent done/missed flags for a habit's dot-history strip (oldest → newest).
export function historyDots(entriesByHabit, habitId, days, n = 20) {
  return days.slice(-n).map((d) => dayDone(entriesByHabit, habitId, d))
}

// XP level from lifetime points. Triangular curve: reaching level L needs a
// cumulative 15·L·(L-1)/2 points, so each level costs 15·L more than the last.
// Returns { level, into, span, pct } where into/span is progress to next level.
export function levelFor(total) {
  const t = Math.max(0, Math.floor(total || 0))
  const cum = (L) => (15 * L * (L - 1)) / 2
  let level = 1
  while (cum(level + 1) <= t) level++
  const into = t - cum(level)
  const span = 15 * level
  return { level, into, span, pct: span ? Math.min(100, (into / span) * 100) : 0 }
}

// Ranked player ids by weekly score (best first) — used for rank-change events.
export function rankedIds(players, entriesByHabit, days) {
  return players
    .map((p) => ({ id: p.id, score: weekScore(p.habits, entriesByHabit, days) }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.id)
}

// Points a habit earns right now (for the floating "+N" on check).
export { habitPoints }
