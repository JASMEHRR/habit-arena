import { useState } from 'react'
import { addHabit } from '../lib/rooms.js'
import { iconKeyFor, iconComponent, ICON_CHOICES } from '../icons.js'
import { PLANE_COLORS } from '../planes.js'
import { fitPoints } from '../budget.js'
import { Button, Field, Sheet } from './ui/Primitives.jsx'
import { useToast } from './ui/Toast.jsx'

// One-tap quick-adds. Colours are the four planes now: a free colour picker
// would let one player's portrait leave the palette, and the composition only
// holds together because there are exactly four.
const PRESETS = [
  { label: 'Sleep', icon: 'moon', kind: 'good', points: 4, target: 8, unit: 'hours', is_bank: true, color: '#1e3a8a' },
  { label: 'Shower', icon: 'shower', kind: 'good', points: 2, target: 1, color: '#1e3a8a' },
  { label: 'Exercise', icon: 'dumbbell', kind: 'good', points: 5, target: 1, color: '#e43d24' },
  { label: 'Eat healthy', icon: 'salad', kind: 'good', points: 4, target: 1, color: '#c8a24b' },
  { label: 'No doomscrolling', icon: 'phone', kind: 'bad', bad_mode: 'reward_avoid', points: 3, color: '#111111' },
  { label: 'Wake up early', icon: 'sun', kind: 'good', points: 4, target: 1, color: '#c8a24b' },
  { label: 'Journaling', icon: 'pen', kind: 'good', points: 3, target: 1, color: '#111111' },
  { label: 'Read', icon: 'book-open', kind: 'good', points: 3, target: 1, color: '#e43d24' },
  { label: 'Meditate', icon: 'flower', kind: 'good', points: 3, target: 1, color: '#1e3a8a' },
  { label: 'Tidy space', icon: 'broom', kind: 'good', points: 2, target: 1, color: '#c8a24b' },
]

const COLOR_NAMES = {
  '#e43d24': 'Vermilion',
  '#1e3a8a': 'Indigo',
  '#c8a24b': 'Gold',
  '#111111': 'Black',
}

const SUGGEST = [
  [/exercise|workout|gym|run/i, 5], [/wake|early/i, 4], [/sleep/i, 4],
  [/journal|read|study|meditat/i, 3], [/water|shower|brush|tidy/i, 2], [/junk|smoke|scroll/i, 4],
]
function suggestPoints(label, kind) {
  for (const [re, p] of SUGGEST) if (re.test(label)) return p
  return kind === 'bad' ? 4 : 3
}

export default function HabitSetup({ player, pointTarget, onChanged }) {
  const toast = useToast()
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('check')
  const [color, setColor] = useState(PLANE_COLORS[0])
  const [kind, setKind] = useState('good')
  const [badMode, setBadMode] = useState('reward_avoid')
  const [points, setPoints] = useState(3)
  const [target, setTarget] = useState(1)
  const [unit, setUnit] = useState('')
  const [pickIcon, setPickIcon] = useState(false)
  const [pointsTouched, setPointsTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  // The room's daily point target is shared, but nothing here blocks an add
  // that would exceed it — see fitPoints. `remaining` is shown so the number is
  // honest, not so it can reject anything.
  const used = player.habits.reduce((s, h) => s + h.points, 0)
  const remaining = Math.max(0, pointTarget - used)

  function updateLabel(v) {
    setLabel(v)
    setIcon(iconKeyFor(v))
    if (!pointsTouched) setPoints(suggestPoints(v, kind))
  }

  async function add(habit) {
    setBusy(true)
    const fitted = fitPoints(habit.points, used, pointTarget)
    try {
      await addHabit(player.id, { ...habit, points: fitted })
      await onChanged()
      if (fitted < habit.points) {
        toast.push(
          `Added “${habit.label}” at ${fitted} point${fitted === 1 ? '' : 's'} instead of ${habit.points} — that's what was left of the room's ${pointTarget}-point target.`,
          'ok'
        )
      }
      return true
    } catch (e) {
      // This used to throw into nothing on a failed add.
      toast.error(e)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addFromForm(e) {
    e?.preventDefault()
    if (!label.trim()) return
    const is_bank = unit === 'hours' || unit === 'glasses'
    const ok = await add({
      label: label.trim(),
      icon,
      color,
      kind,
      points: Number(points) || 1,
      bad_mode: badMode,
      target: Number(target) || 1,
      unit,
      is_bank,
    })
    if (!ok) return
    setLabel('')
    setIcon('check')
    setPointsTouched(false)
    setPoints(suggestPoints('', kind))
    setTarget(1)
    setUnit('')
  }

  const PickedIcon = iconComponent(icon)

  return (
    <Sheet title="Add a habit" className="section--tight">
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        {used} of {pointTarget} points used. Adding more than {remaining} left
        shrinks the new habit's points to fit — it is always added.
      </p>

      <p className="caption caption--ink">Quick add</p>
      <div className="row row--tight" style={{ margin: 'var(--space-2) 0 var(--space-5)' }}>
        {PRESETS.map((p) => {
          const PIcon = iconComponent(p.icon)
          return (
            <button
              key={p.label}
              type="button"
              className="chip"
              disabled={busy}
              onClick={() =>
                add({ ...p, target: p.target || 1, unit: p.unit || '', is_bank: !!p.is_bank })
              }
            >
              <PIcon size={14} aria-hidden="true" /> {p.label}
              <span className="caption">+{p.points}</span>
            </button>
          )
        })}
      </div>

      {/* A real form: Enter submits, and the browser validates. */}
      <form onSubmit={addFromForm}>
        <Field
          label="Habit name"
          id="habit-name"
          value={label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Read"
          required
          maxLength={60}
        />

        {/* Matches the field pattern above: caption, then control. Reversed, it
            read as an unexplained button with a word beside it. */}
        <fieldset>
          <legend>Icon</legend>
          <Button
            icon={<PickedIcon size={20} />}
            label={pickIcon ? 'Close the icon picker' : 'Change the icon'}
            aria-expanded={pickIcon}
            onClick={() => setPickIcon((s) => !s)}
          />
          <span className="quiet small" style={{ marginLeft: 'var(--space-3)' }}>
            {pickIcon ? 'Pick one below' : 'Chosen from the name — tap to change'}
          </span>
        </fieldset>

        {pickIcon && (
          <div className="picker-grid" style={{ marginBottom: 'var(--space-4)' }}>
            {ICON_CHOICES.map((k) => {
              const KI = iconComponent(k)
              return (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={k === icon}
                  aria-label={`Icon: ${k.replace('-', ' ')}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    setIcon(k)
                    setPickIcon(false)
                  }}
                >
                  <KI size={18} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        )}

        <fieldset>
          <legend>Plane colour</legend>
          <div className="swatches">
            {PLANE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                aria-pressed={c === color}
                style={{ background: c }}
                aria-label={COLOR_NAMES[c]}
                title={COLOR_NAMES[c]}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </fieldset>

        {/* A real radio group: shared name, so arrow keys work. The old pair had
            no name attribute and so was not a group at all. */}
        <fieldset>
          <legend>Kind</legend>
          <div className="row">
            <label className="chip">
              <input
                type="radio"
                name="habit-kind"
                value="good"
                checked={kind === 'good'}
                onChange={() => setKind('good')}
              />
              Good habit
            </label>
            <label className="chip">
              <input
                type="radio"
                name="habit-kind"
                value="bad"
                checked={kind === 'bad'}
                onChange={() => setKind('bad')}
              />
              Bad habit
            </label>
          </div>
        </fieldset>

        {kind === 'bad' ? (
          <Field label="How it scores" id="bad-mode">
            <select
              className="field__control"
              id="bad-mode"
              value={badMode}
              onChange={(e) => setBadMode(e.target.value)}
            >
              <option value="reward_avoid">Reward me for avoiding it</option>
              <option value="penalty_do">Penalise me if I do it</option>
              <option value="both">Both</option>
            </select>
          </Field>
        ) : (
          <div className="grid-2">
            <Field
              label="Daily target"
              type="number"
              min="1"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Field label="Unit" id="habit-unit" hint="Hours and glasses feed the Bank.">
              <select
                className="field__control"
                id="habit-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="">reps</option>
                <option value="hours">hours</option>
                <option value="glasses">glasses</option>
              </select>
            </Field>
          </div>
        )}

        <Field
          label="Points"
          hint={
            remaining > 0
              ? `Suggested from the name. ${remaining} left before this room's ${pointTarget}-point target.`
              : `Suggested from the name. Already at ${pointTarget} — this will still be added at 1 point.`
          }
          type="number"
          min="1"
          inputMode="numeric"
          value={points}
          onChange={(e) => {
            setPointsTouched(true)
            setPoints(e.target.value)
          }}
        />

        <Button type="submit" variant="primary" loading={busy} disabled={!label.trim()}>
          Add habit
        </Button>
      </form>
    </Sheet>
  )
}
