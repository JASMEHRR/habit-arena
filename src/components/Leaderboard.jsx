import { useState } from 'react'
import { Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { weekScore, streak, dayDone } from '../stats.js'
import { iconComponent } from '../icons.js'

// Group standings, ranked by weekly score. Highlights the current player.
// `limit` caps how many rows render (used by the dashboard overview preview).
// Rows expand to show that player's actual habit list — full visibility, so
// no one can pad their score with habits no one else can see or check.
export default function Leaderboard({ players, entriesByHabit, days, today, meId, limit }) {
  const [openId, setOpenId] = useState(null)
  const ranked = players
    .map((p) => ({
      p,
      week: weekScore(p.habits, entriesByHabit, days),
      streak: streak(p.habits, entriesByHabit, days),
    }))
    .sort((a, b) => b.week - a.week)

  const myIdx = ranked.findIndex((r) => r.p.id === meId)
  const myRank = myIdx + 1
  const rows = limit ? ranked.slice(0, limit) : ranked

  // Motivating nudge: gap to the person just ahead, or your lead at #1.
  let nudge = null
  if (myIdx > 0) {
    const gap = ranked[myIdx - 1].week - ranked[myIdx].week
    nudge = `${gap} pt${gap === 1 ? '' : 's'} to catch ${ranked[myIdx - 1].p.display_name}`
  } else if (myIdx === 0 && ranked.length > 1) {
    const lead = ranked[0].week - ranked[1].week
    nudge = lead > 0 ? `Leading by ${lead} pt${lead === 1 ? '' : 's'} 👑` : 'Tied for the lead — pull ahead!'
  }

  return (
    <div className="card leaderboard">
      <div className="lb-head">
        <h2>Leaderboard</h2>
        {myRank > 0 && <span className="lb-you">You're #{myRank} of {ranked.length}</span>}
      </div>
      {nudge && <p className="lb-nudge">{nudge}</p>}
      <ul className="lb-list">
        {rows.map((r, i) => {
          const open = openId === r.p.id
          return (
            <li key={r.p.id} className={(r.p.id === meId ? 'me' : '') + (open ? ' expanded' : '')}>
              <button
                className="lb-row-btn"
                onClick={() => setOpenId(open ? null : r.p.id)}
                aria-expanded={open}
              >
                <span className={'lb-rank' + (i === 0 ? ' gold' : '')}>{i + 1}</span>
                <span className="lb-avatar">{r.p.avatar}</span>
                <span className="lb-name">{r.p.display_name}{r.p.id === meId && <em> (you)</em>}</span>
                {r.streak > 0 && (
                  <span className="lb-streak"><Flame size={13} /> {r.streak}</span>
                )}
                <span className={'lb-score ' + (r.week < 0 ? 'neg' : 'pos')}>{r.week}</span>
                {open ? <ChevronUp size={15} className="lb-chevron" /> : <ChevronDown size={15} className="lb-chevron" />}
              </button>
              {open && today && (
                <ul className="lb-habits">
                  {r.p.habits.length === 0 && <li className="muted small">No habits set up yet.</li>}
                  {r.p.habits.map((h) => {
                    const Icon = iconComponent(h.icon)
                    const done = dayDone(entriesByHabit, h.id, today)
                    const logged = entriesByHabit[h.id]?.[today] !== undefined
                    const isBad = h.kind === 'bad'
                    let status, mood
                    if (!logged) { status = 'Not logged'; mood = 'neutral' }
                    else if (isBad) { status = done ? 'Slipped' : 'Avoided'; mood = done ? 'bad' : 'good' }
                    else { status = done ? 'Done' : 'Not done'; mood = done ? 'good' : 'neutral' }
                    return (
                      <li key={h.id}>
                        <Icon size={14} />
                        <span className="lb-habit-name">{h.label}{h.is_mandatory && ' 📌'}</span>
                        <span className={'lb-habit-status ' + mood}>{status}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
