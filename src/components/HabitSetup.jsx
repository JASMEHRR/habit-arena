import { useState } from 'react'
import { addHabit } from '../lib/rooms.js'

// Simple heuristic: suggest a point value from the habit label. The user can
// always override it. Bad habits default to a slightly higher value because
// avoiding them takes willpower.
const SUGGESTIONS = [
  { match: /exercise|workout|gym|run|walk/i, points: 5 },
  { match: /wake|early|morning/i, points: 4 },
  { match: /sleep|bed/i, points: 4 },
  { match: /read|study|learn/i, points: 3 },
  { match: /meditat|journal/i, points: 3 },
  { match: /water|hydrat/i, points: 2 },
  { match: /shower|bath|brush|floss/i, points: 2 },
  { match: /junk|sugar|soda|fast food/i, points: 4 },
  { match: /smoke|vape|alcohol|drink/i, points: 5 },
  { match: /scroll|phone|social|screen/i, points: 3 },
]
function suggestPoints(label, kind) {
  for (const s of SUGGESTIONS) if (s.match.test(label)) return s.points
  return kind === 'bad' ? 4 : 3 // sensible defaults
}

// Quick-add presets both players are likely to share.
const PRESETS = [
  { label: 'Sleep 8h', kind: 'good' },
  { label: 'Drink water', kind: 'good' },
  { label: 'Shower', kind: 'good' },
  { label: 'Exercise', kind: 'good' },
  { label: 'No junk food', kind: 'bad', bad_mode: 'reward_avoid' },
  { label: 'No doomscrolling', kind: 'bad', bad_mode: 'both' },
]

export default function HabitSetup({ player, onChanged }) {
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState('good')
  const [badMode, setBadMode] = useState('reward_avoid')
  const [points, setPoints] = useState(3)
  const [pointsTouched, setPointsTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  // Keep the suggested value in sync until the user edits it manually.
  function updateLabel(v) {
    setLabel(v)
    if (!pointsTouched) setPoints(suggestPoints(v, kind))
  }
  function updateKind(v) {
    setKind(v)
    if (!pointsTouched) setPoints(suggestPoints(label, v))
  }

  async function add(habit) {
    setBusy(true)
    try {
      await addHabit(player.id, habit)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function addFromForm() {
    if (!label.trim()) return
    await add({ label: label.trim(), kind, points: Number(points) || 0, bad_mode: badMode })
    setLabel('')
    setPointsTouched(false)
    setPoints(suggestPoints('', kind))
  }

  return (
    <div className="card">
      <h2>Set up {player.display_name}'s habits</h2>
      <p className="muted">
        Add the habits you want to compete on. Good habits earn points when
        done; bad habits can reward you for avoiding them.
      </p>

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="chip"
            disabled={busy}
            onClick={() =>
              add({
                label: p.label,
                kind: p.kind,
                points: suggestPoints(p.label, p.kind),
                bad_mode: p.bad_mode || null,
              })
            }
          >
            + {p.label}
          </button>
        ))}
      </div>

      <div className="setup-form">
        <input
          placeholder="Habit name (e.g. Exercise)"
          value={label}
          onChange={(e) => updateLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addFromForm()}
        />

        <div className="row">
          <label className="seg">
            <input type="radio" checked={kind === 'good'} onChange={() => updateKind('good')} />
            Good habit
          </label>
          <label className="seg">
            <input type="radio" checked={kind === 'bad'} onChange={() => updateKind('bad')} />
            Bad habit
          </label>
        </div>

        {kind === 'bad' && (
          <label className="field">
            How it scores
            <select value={badMode} onChange={(e) => setBadMode(e.target.value)}>
              <option value="reward_avoid">Reward me for avoiding it</option>
              <option value="penalty_do">Penalize me if I do it</option>
              <option value="both">Both (reward + penalty)</option>
            </select>
          </label>
        )}

        <label className="field">
          Points <small>(suggested, editable)</small>
          <input
            type="number"
            className="num"
            min="0"
            value={points}
            onChange={(e) => {
              setPointsTouched(true)
              setPoints(e.target.value)
            }}
          />
        </label>

        <button onClick={addFromForm} disabled={busy || !label.trim()}>
          Add habit
        </button>
      </div>

      {player.habits.length > 0 && (
        <ul className="setup-list">
          {player.habits.map((h) => (
            <li key={h.id}>
              <span>{h.label}</span>
              <span className="muted">
                {h.kind === 'good' ? `good · +${h.points}` : `bad · ${h.bad_mode} · ${h.points}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
