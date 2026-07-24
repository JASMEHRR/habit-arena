import { Flame } from 'lucide-react'
import { weekScore, streak } from '../stats.js'

const MEDALS = ['🥇', '🥈', '🥉']

// Group standings, ranked by weekly score. Highlights the current player.
export default function Leaderboard({ players, entriesByHabit, days, meId }) {
  const rows = players
    .map((p) => ({
      p,
      week: weekScore(p.habits, entriesByHabit, days),
      streak: streak(p.habits, entriesByHabit, days),
    }))
    .sort((a, b) => b.week - a.week)

  const myRank = rows.findIndex((r) => r.p.id === meId) + 1

  return (
    <div className="card leaderboard">
      <div className="lb-head">
        <h2>Leaderboard</h2>
        {myRank > 0 && <span className="lb-you">You're #{myRank} of {rows.length}</span>}
      </div>
      <ul className="lb-list">
        {rows.map((r, i) => (
          <li key={r.p.id} className={r.p.id === meId ? 'me' : ''}>
            <span className="lb-rank">{MEDALS[i] || i + 1}</span>
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
