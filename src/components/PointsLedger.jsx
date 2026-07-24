import { X } from 'lucide-react'
import { habitPoints } from '../scoring.js'
import { iconComponent } from '../icons.js'

// A plain, chronological "why did I gain/lose these points" log — every
// logged entry for the last N days, newest first, each with a delete button
// that reverts it to unlogged (removing its point contribution entirely).
export default function PointsLedger({ habits, entriesByHabit, days, onDelete }) {
  const rows = []
  for (const date of days) {
    for (const h of habits) {
      const entry = entriesByHabit[h.id]?.[date]
      if (entry === undefined) continue
      const pts = habitPoints(h, entry.done, true)
      rows.push({ date, habit: h, pts })
    }
  }
  rows.reverse() // newest day first

  return (
    <div className="card">
      <h2>Points ledger</h2>
      <p className="muted small">Every logged entry, and why it counted. Remove one to undo it.</p>
      {rows.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>Nothing logged yet.</p>}
      <ul className="ledger-list">
        {rows.map((r) => {
          const Icon = iconComponent(r.habit.icon)
          return (
            <li key={r.habit.id + r.date}>
              <Icon size={14} />
              <span className="ledger-date">{r.date}</span>
              <span className="ledger-label">{r.habit.label}</span>
              <span className={'ledger-pts' + (r.pts > 0 ? ' pos' : r.pts < 0 ? ' neg' : '')}>
                {r.pts > 0 ? '+' : ''}{r.pts} pts
              </span>
              <button className="ledger-del" title="Delete this entry" onClick={() => onDelete(r.habit.id, r.date)}>
                <X size={13} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
