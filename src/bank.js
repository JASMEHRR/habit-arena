// Habit Arena — the "Bank": sleep/health debt tracking (pure, dependency-free).
//
// A "bank habit" has a numeric daily target (e.g. sleep 8h, water 8 glasses).
// Logging BELOW target adds the shortfall as debt. Logging ABOVE target on a
// later day repays existing debt (but never banks credit — debt floors at 0).
// Unpaid debt at week end subtracts from the weekly score.

// Debt for one bank habit given its target and the values logged per day
// (chronological order). Each day: debt = max(0, debt + (target - value)).
export function habitDebt(target, dailyValues = []) {
  let debt = 0
  for (const v of dailyValues) {
    const value = Number(v) || 0
    debt = Math.max(0, debt + (target - value))
  }
  return debt
}

// Total bank debt across every bank habit.
// `habits`: array of { id, target, is_bank }.
// `valuesByHabit`: { [habitId]: number[] } chronological daily values.
export function bankTotal(habits, valuesByHabit = {}) {
  let total = 0
  for (const h of habits) {
    if (!h.is_bank) continue
    total += habitDebt(h.target, valuesByHabit[h.id] || [])
  }
  return total
}

// Weekly score penalty from unpaid debt. Default: 1 point lost per unit of debt.
export function bankPenalty(debt, perUnit = 1) {
  return Math.round(Math.max(0, debt) * perUnit)
}

// How "full" the debt meter should look, 0..100. `cap` is the debt level at
// which the meter reads full (keeps a small shortfall from pinning to 100%).
export function debtMeterPercent(debt, cap = 16) {
  if (debt <= 0) return 0
  return Math.min(100, (debt / cap) * 100)
}
