import { useState } from 'react'
import { X } from 'lucide-react'
import { habitPoints } from '../scoring.js'
import { iconComponent } from '../icons.js'
import { Button, EmptyState, Sheet } from './ui/Primitives.jsx'

const PAGE = 25

// Every logged entry and why it counted.
//
// Fixed here: the delete had no confirmation and no undo (while leaving a room
// asked twice), dates rendered as raw ISO strings, and it rendered every entry
// across all thirty days with no cap.
export default function PointsLedger({ habits, entriesByHabit, days, onDelete }) {
  const [shown, setShown] = useState(PAGE)

  const rows = []
  for (const date of days) {
    for (const h of habits) {
      const entry = entriesByHabit[h.id]?.[date]
      if (entry === undefined) continue
      rows.push({ date, habit: h, pts: habitPoints(h, entry.done, true) })
    }
  }
  rows.reverse() // newest first

  if (rows.length === 0) {
    return (
      <Sheet title="Ledger">
        <EmptyState title="Nothing logged yet">
          Once you start marking habits, every entry shows up here with the
          points it earned or cost — and you can remove one to undo it.
        </EmptyState>
      </Sheet>
    )
  }

  const page = rows.slice(0, shown)

  return (
    <Sheet title="Ledger" className="section--tight">
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        Every logged entry, and why it counted. Removing one reverts it to
        unlogged.
      </p>
      <table className="ledger">
        <caption className="sr-only">Logged habit entries, newest first</caption>
        <tbody>
          {page.map((r) => {
            const Icon = iconComponent(r.habit.icon)
            return (
              <tr key={r.habit.id + r.date}>
                <td>{shortDate(r.date)}</td>
                <td>
                  <span className="row row--tight">
                    <Icon size={14} aria-hidden="true" />
                    {r.habit.label}
                  </span>
                </td>
                <td
                  className={`ledger__pts ${
                    r.pts > 0 ? 'ledger__pts--pos' : r.pts < 0 ? 'ledger__pts--neg' : ''
                  }`}
                >
                  {r.pts > 0 ? '+' : ''}
                  {r.pts}
                </td>
                <td style={{ width: '1%' }}>
                  <Button
                    variant="ghost"
                    icon={<X size={14} />}
                    label={`Remove the ${r.habit.label} entry for ${shortDate(r.date)}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove the “${r.habit.label}” entry for ${shortDate(r.date)}? Its ${
                            r.pts >= 0 ? '+' : ''
                          }${r.pts} points go with it.`
                        )
                      )
                        onDelete(r.habit.id, r.date)
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {shown < rows.length && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, rows.length - shown)} more of {rows.length}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

function shortDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}
