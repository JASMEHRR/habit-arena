import { Flame } from 'lucide-react'
import { weekScore, streak } from '../stats.js'

// Group standings, ranked by weekly score. Highlights the current player.
// `limit` caps how many rows render (used by the dashboard overview preview).
export default function Leaderboard({ players, entriesByHabit, days, meId, limit }) {
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
        {rows.map((r, i) => (
          <li key={r.p.id} className={r.p.id === meId ? 'me' : ''}>
            <span className={'lb-rank' + (i === 0 ? ' gold' : '')}>{i + 1}</span>
            <span className="lb-avatar">{r.p.avatar}</span>
            <span className="lb-name">{r.p.display_name}{r.p.id === meId && <em> (you)</em>}</span>
            {r.streak > 0 && (
              <span className="lb-streak"><Flame size={13} /> {r.streak}</span>
            )}
            <span className={'lb-score ' + (r.week < 0 ? 'neg' : 'pos')}>{r.week}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
