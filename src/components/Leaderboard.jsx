import { useState } from 'react'
import { Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { weekScore, streak, dayDone, dayCompletion } from '../stats.js'
import { iconComponent } from '../icons.js'
import { MiniPortrait } from './PlanePortrait.jsx'
import { planeOn } from './HabitRoster.jsx'
import { Avatar, Badge, EmptyState } from './ui/Primitives.jsx'

// Standings, ranked by weekly score.
//
// Two changes that matter beyond the paint: it is a real <table>, so a screen
// reader associates a rank and a score with a player instead of reading a pile
// of spans; and each player's day appears as their figure, which is what a
// leaderboard is for in this world — a series of portraits at different degrees
// of resolution. First place is marked by a gold plane as well as its number, so
// rank is never carried by colour alone.
export default function Leaderboard({ players, entriesByHabit, days, today, meId, limit }) {
  const [openId, setOpenId] = useState(null)
  const ranked = players
    .map((p) => ({
      p,
      week: weekScore(p.habits, entriesByHabit, days),
      streak: streak(p.habits, entriesByHabit, days),
      pct: today ? dayCompletion(p.habits, entriesByHabit, today).pct : 0,
    }))
    .sort((a, b) => b.week - a.week)

  const myIdx = ranked.findIndex((r) => r.p.id === meId)
  const rows = limit ? ranked.slice(0, limit) : ranked

  if (ranked.length === 0) {
    return (
      <EmptyState title="Nobody here yet">
        Share the invite link and the board fills up as people join.
      </EmptyState>
    )
  }

  // The gap to the person just ahead, or your lead at the top.
  let nudge = null
  if (myIdx > 0) {
    const gap = ranked[myIdx - 1].week - ranked[myIdx].week
    nudge = `${gap} point${gap === 1 ? '' : 's'} behind ${ranked[myIdx - 1].p.display_name}.`
  } else if (myIdx === 0 && ranked.length > 1) {
    const lead = ranked[0].week - ranked[1].week
    nudge = lead > 0 ? `You lead by ${lead} point${lead === 1 ? '' : 's'}.` : 'Tied for the lead.'
  }

  return (
    <>
      {nudge && <p className="quiet" style={{ marginBottom: 'var(--space-4)' }}>{nudge}</p>}
      <table className="board">
        <caption className="sr-only">
          Room standings by points this week, best first
        </caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Week</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const open = openId === r.p.id
            const isMe = r.p.id === meId
            return (
              <Row
                key={r.p.id}
                r={r}
                index={i}
                open={open}
                isMe={isMe}
                today={today}
                entriesByHabit={entriesByHabit}
                onToggle={() => setOpenId(open ? null : r.p.id)}
              />
            )
          })}
        </tbody>
      </table>
    </>
  )
}

function Row({ r, index, open, isMe, today, entriesByHabit, onToggle }) {
  const panelId = `lb-habits-${r.p.id}`
  return (
    <>
      <tr data-me={String(isMe)}>
        <td className={`board__rank ${index === 0 ? 'board__rank--first' : ''}`}>{index + 1}</td>
        <td>
          <button
            type="button"
            className="board__who"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            style={{ width: '100%' }}
          >
            {today && r.p.habits.length > 0 ? (
              <MiniPortrait
                habits={r.p.habits}
                isOn={(h) => planeOn(h, entriesByHabit, today)}
                label={`${r.p.display_name}: ${Math.round(r.pct)} per cent of today complete`}
              />
            ) : (
              <Avatar name={r.p.display_name} seed={r.p.avatar} />
            )}
            <span>
              <span style={{ fontWeight: 'var(--wt-semi)' }}>{r.p.display_name}</span>
              {isMe && <Badge tone="indigo"> You</Badge>}
              <span className="hrow__meta">
                {r.streak > 0 && (
                  <span>
                    <Flame size={12} aria-hidden="true" /> {r.streak}-day streak
                  </span>
                )}
                <span>{Math.round(r.pct)}% today</span>
              </span>
            </span>
            <span className="push" aria-hidden="true">
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
        </td>
        <td className={`board__score ${r.week < 0 ? 'board__score--neg' : ''}`}>{r.week}</td>
      </tr>
      {open && (
        <tr id={panelId}>
          <td />
          <td colSpan={2}>
            {r.p.habits.length === 0 ? (
              <p className="quiet small">No habits set up yet.</p>
            ) : (
              <ul>
                {r.p.habits.map((h) => {
                  const Icon = iconComponent(h.icon)
                  const done = dayDone(entriesByHabit, h.id, today)
                  const logged = entriesByHabit[h.id]?.[today] !== undefined
                  const isBad = h.kind === 'bad'
                  let status
                  if (!logged) status = 'Not logged'
                  else if (isBad) status = done ? 'Slipped' : 'Avoided'
                  else status = done ? 'Done' : 'Not done'
                  return (
                    <li key={h.id} className="row row--between" style={{ padding: '4px 0' }}>
                      <span className="row row--tight">
                        <Icon size={14} aria-hidden="true" />
                        {h.label}
                        {h.is_mandatory && <span className="caption">shared</span>}
                      </span>
                      <span className="small quiet">{status}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
