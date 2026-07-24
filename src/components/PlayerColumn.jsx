import { habitPoints, dailyMax, playerScore, progressPercent } from '../scoring.js'

// One player's column: progress bar at the top, then today's habit checkboxes.
// `editable` is true only for the viewer's own column.
// `leading` is true when this player is currently ahead (adds a crown + glow).
export default function PlayerColumn({ player, doneByHabit, editable, leading, onToggle }) {
  const earned = playerScore(player.habits, doneByHabit)
  const max = dailyMax(player.habits)
  const pct = progressPercent(earned, max)

  return (
    <div className={'card column' + (leading ? ' leading' : '')}>
      <div className="col-head">
        <h2>
          {leading && <span className="crown" aria-label="leading" title="Leading">👑</span>}
          {player.display_name}
        </h2>
        <span className={'score ' + (earned < 0 ? 'neg' : 'pos')}>{earned}</span>
      </div>

      {/* Progress bar: today's earned points vs the best possible today. */}
      <div className="progress" title={`${earned} / ${max} points today`}>
        <div className="bar-fill" style={{ width: pct + '%' }} />
      </div>
      <div className="progress-label">
        {earned} / {max} points today
      </div>

      {player.habits.length === 0 ? (
        <p className="muted">No habits yet.</p>
      ) : (
        <ul className="habits">
          {player.habits.map((h) => {
            const done = !!doneByHabit[h.id]
            const pts = habitPoints(h, done)
            return (
              <li key={h.id} className={done ? 'checked' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={!editable}
                    onChange={() => onToggle(h.id, !done)}
                  />
                  <span className="hlabel">
                    {h.label}
                    <small>
                      {h.kind === 'good'
                        ? ` (good, +${h.points})`
                        : ` (bad, ${badHint(h)})`}
                    </small>
                  </span>
                </label>
                <span className={'pts ' + (pts < 0 ? 'minus' : pts > 0 ? 'plus' : 'zero')}>
                  {pts > 0 ? `+${pts}` : pts}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {!editable && <p className="muted small">Live view — only {player.display_name} can tick these.</p>}
    </div>
  )
}

function badHint(h) {
  if (h.bad_mode === 'reward_avoid') return `+${h.points} if avoided`
  if (h.bad_mode === 'penalty_do') return `-${h.points} if done`
  return `±${h.points}` // both
}
