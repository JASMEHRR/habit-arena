import { useState } from 'react'
import { addHabit } from '../lib/rooms.js'
import { iconKeyFor, iconComponent, ICON_CHOICES, HABIT_COLORS } from '../icons.js'

// Built-in "daily necessities" — one-tap quick-adds (§3).
const PRESETS = [
  { label: 'Sleep', icon: 'moon', kind: 'good', points: 4, target: 8, unit: 'hours', is_bank: true, color: '#7c6cff' },
  { label: 'Brush teeth', icon: 'brush', kind: 'good', points: 2, target: 2, unit: '', color: '#06b6d4' },
  { label: 'Shower', icon: 'shower', kind: 'good', points: 2, target: 1, color: '#3b82f6' },
  { label: 'Drink water', icon: 'droplet', kind: 'good', points: 2, target: 8, unit: 'glasses', is_bank: true, color: '#06b6d4' },
  { label: 'Exercise', icon: 'dumbbell', kind: 'good', points: 5, target: 1, color: '#ef4444' },
  { label: 'Eat healthy', icon: 'salad', kind: 'good', points: 4, target: 1, color: '#22c55e' },
  { label: 'No doomscrolling', icon: 'phone', kind: 'bad', bad_mode: 'reward_avoid', points: 3, color: '#f97316' },
  { label: 'Wake up early', icon: 'sun', kind: 'good', points: 4, target: 1, color: '#f59e0b' },
  { label: 'Journaling', icon: 'pen', kind: 'good', points: 3, target: 1, color: '#8b5cf6' },
  { label: 'Read', icon: 'book-open', kind: 'good', points: 3, target: 1, color: '#ec4899' },
  { label: 'Meditate', icon: 'flower', kind: 'good', points: 3, target: 1, color: '#10b981' },
  { label: 'Tidy space', icon: 'broom', kind: 'good', points: 2, target: 1, color: '#3b82f6' },
]

const SUGGEST = [
  [/exercise|workout|gym|run/i, 5], [/wake|early/i, 4], [/sleep/i, 4],
  [/journal|read|study|meditat/i, 3], [/water|shower|brush|tidy/i, 2], [/junk|smoke|scroll/i, 4],
]
function suggestPoints(label, kind) {
  for (const [re, p] of SUGGEST) if (re.test(label)) return p
  return kind === 'bad' ? 4 : 3
}

export default function HabitSetup({ player, onChanged }) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('check')
  const [color, setColor] = useState(HABIT_COLORS[0])
  const [kind, setKind] = useState('good')
  const [badMode, setBadMode] = useState('reward_avoid')
  const [points, setPoints] = useState(3)
  const [target, setTarget] = useState(1)
  const [unit, setUnit] = useState('')
  const [pickIcon, setPickIcon] = useState(false)
  const [pointsTouched, setPointsTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  function updateLabel(v) {
    setLabel(v)
    setIcon(iconKeyFor(v))
    if (!pointsTouched) setPoints(suggestPoints(v, kind))
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
    const is_bank = unit === 'hours' || unit === 'glasses'
    await add({
      label: label.trim(), icon, color, kind,
      points: Number(points) || 0, bad_mode: badMode,
      target: Number(target) || 1, unit, is_bank,
    })
    setLabel(''); setIcon('check'); setPointsTouched(false)
    setPoints(suggestPoints('', kind)); setTarget(1); setUnit('')
  }

  const PickedIcon = iconComponent(icon)

  return (
    <div className="card setup">
      <h2>Add a habit</h2>
      <div className="presets">
        {PRESETS.map((p) => {
          const PIcon = iconComponent(p.icon)
          return (
            <button key={p.label} className="chip" disabled={busy}
              onClick={() => add({ ...p, target: p.target || 1, unit: p.unit || '', is_bank: !!p.is_bank })}>
              <PIcon size={14} /> {p.label}
            </button>
          )
        })}
      </div>

      <div className="setup-form">
        <div className="label-row">
          <button className="icon-btn" style={{ '--habit': color }} onClick={() => setPickIcon((s) => !s)} title="Pick icon">
            <PickedIcon size={20} />
          </button>
          <input placeholder="Habit name (e.g. Read)" value={label}
            onChange={(e) => updateLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromForm()} />
        </div>

        {pickIcon && (
          <div className="icon-picker">
            {ICON_CHOICES.map((k) => {
              const KI = iconComponent(k)
              return (
                <button key={k} className={'ipick' + (k === icon ? ' on' : '')}
                  onClick={() => { setIcon(k); setPickIcon(false) }}>
                  <KI size={18} />
                </button>
              )
            })}
          </div>
        )}

        <div className="swatches">
          {HABIT_COLORS.map((c) => (
            <button key={c} className={'swatch' + (c === color ? ' on' : '')}
              style={{ background: c }} onClick={() => setColor(c)} aria-label={'color ' + c} />
          ))}
        </div>

        <div className="row">
          <label className="seg"><input type="radio" checked={kind === 'good'} onChange={() => setKind('good')} /> Good habit</label>
          <label className="seg"><input type="radio" checked={kind === 'bad'} onChange={() => setKind('bad')} /> Bad habit</label>
        </div>

        {kind === 'bad' ? (
          <label className="field">How it scores
            <select value={badMode} onChange={(e) => setBadMode(e.target.value)}>
              <option value="reward_avoid">Reward me for avoiding it</option>
              <option value="penalty_do">Penalize me if I do it</option>
              <option value="both">Both</option>
            </select>
          </label>
        ) : (
          <div className="row">
            <label className="field">Daily target
              <input type="number" className="num" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="field">Unit <small>(optional)</small>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="">reps</option>
                <option value="hours">hours (bank)</option>
                <option value="glasses">glasses (bank)</option>
              </select>
            </label>
          </div>
        )}

        <label className="field">Points <small>(suggested, editable)</small>
          <input type="number" className="num" min="0" value={points}
            onChange={(e) => { setPointsTouched(true); setPoints(e.target.value) }} />
        </label>

        <button onClick={addFromForm} disabled={busy || !label.trim()}>Add habit</button>
      </div>
    </div>
  )
}
