// The roster: every habit as one quiet labelled row, on the same grid as the
// portrait. This is the second half of Tanaka's composition rule — a monumental
// figure beside a whisper-quiet caption grid — and it is what lets an abstract
// figure carry a daily task surface: the composition summarises, the roster
// names. Both mark the same habit.
//
// It replaces HabitCard, whose tick targets were below 44px, whose remove button
// had no accessible name, and which spent a whole row per habit on twenty
// decorative aria-hidden history dots.
//
// Every habit is editable and removable here, including the three "shared"
// starter habits — is_mandatory only drives the badge, nothing blocks changing
// or deleting them. Editing a habit's points never rejects the change; it fits
// to whatever is left of the room's target (see src/budget.js), the same rule
// adding a new habit follows.
import { useState } from 'react'
import { Check, Plus, Minus, X, Pencil, Pin } from 'lucide-react'
import { iconComponent, ICON_CHOICES } from '../icons.js'
import { habitPoints } from '../scoring.js'
import { dayValue, historyDots } from '../stats.js'
import { assignPlanes, planeColorVar, PLANE_COLORS } from '../planes.js'
import { fitPoints } from '../budget.js'
import { Button, Field } from './ui/Primitives.jsx'

// A habit's plane is landed when the habit has actually been earned: a good
// habit completed, or a bad habit explicitly logged as avoided. Silence is not
// credit — the same rule scoring.js applies.
export function planeOn(habit, entriesByHabit, date) {
  const entry = entriesByHabit[habit.id]?.[date]
  if (entry === undefined) return false
  const target = habit.target || 1
  const done = (entry.value ?? 0) >= target
  return habit.kind === 'bad' ? !done : done
}

export default function HabitRoster({
  habits, entriesByHabit, days, today, pointTarget, onSetValue, onRemove, onEdit,
}) {
  // Rows follow the plane assignment, so the row order and the figure agree and
  // "the third row is the gold bar" stays true.
  const { assigned, overflow } = assignPlanes(habits)
  const rows = [
    ...assigned.map(({ habit, slot, fill }) => ({ habit, slot, fill })),
    ...overflow.map((habit) => ({ habit, slot: null, fill: null })),
  ]
  const totalUsed = habits.reduce((s, h) => s + h.points, 0)

  return (
    <ul className="roster">
      {rows.map(({ habit, slot, fill }) => (
        <HabitRow
          key={habit.id}
          habit={habit}
          slot={slot}
          fill={fill}
          entriesByHabit={entriesByHabit}
          days={days}
          today={today}
          pointTarget={pointTarget}
          usedByOthers={totalUsed - habit.points}
          onSetValue={onSetValue}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </ul>
  )
}

function HabitRow({
  habit, slot, fill, entriesByHabit, days, today, pointTarget, usedByOthers,
  onSetValue, onRemove, onEdit,
}) {
  const Icon = iconComponent(habit.icon)
  const value = dayValue(entriesByHabit, habit.id, today)
  const target = habit.target || 1
  const done = value >= target
  const logged = entriesByHabit[habit.id]?.[today] !== undefined
  const numeric = habit.is_bank || !!habit.unit
  const isCheck = target === 1 && !numeric
  const isBad = habit.kind === 'bad'
  const on = planeOn(habit, entriesByHabit, today)
  const points = habitPoints(habit, true)
  const [floats, setFloats] = useState([])
  const [editing, setEditing] = useState(false)

  function floatPoints(n) {
    const id = Math.random()
    setFloats((f) => [...f, { id, n }])
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900)
  }

  function set(next) {
    const clamped = Math.max(0, next)
    const wasDone = done
    onSetValue(habit.id, clamped, target)
    if (!wasDone && clamped >= target && points > 0) floatPoints(points)
  }
  function markAvoided() {
    const pts = habitPoints(habit, false, true)
    onSetValue(habit.id, 0, target)
    if (!logged && pts > 0) floatPoints(pts)
  }
  function markSlipped() {
    onSetValue(habit.id, target, target)
  }

  const swatch = fill || planeColorVar(habit.color, { color: '#1e3a8a' })
  // The checkmark's own colour, chosen per plane: gold is the one fill light
  // enough to need dark ink, so `color: var(--bg)` (used for every other plane)
  // put a near-black tick on the near-black "avoided" indigo/vermilion/black
  // fills at night — invisible on all three.
  const markInk = swatch === 'var(--plane-gold)' ? 'var(--plane-black)' : 'var(--on-plane-black)'
  const run = historyDots(entriesByHabit, habit.id, days, 7)
  const runDone = run.filter(Boolean).length

  if (editing) {
    return (
      <li className="hrow" style={{ display: 'block', padding: 'var(--space-4) 0' }}>
        <EditForm
          habit={habit}
          pointTarget={pointTarget}
          usedByOthers={usedByOthers}
          onCancel={() => setEditing(false)}
          onSave={async (patch) => {
            await onEdit(habit.id, patch)
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className={`hrow ${on ? '' : 'hrow--off'}`} style={{ position: 'relative' }}>
      <span className="hrow__swatch" style={{ '--hswatch': swatch }} aria-hidden="true" />

      <div className="hrow__body">
        <span className="hrow__name">
          <Icon size={15} aria-hidden="true" />
          {habit.label}
          {habit.is_mandatory && (
            <span
              className="badge badge--quiet"
              title="Seeded for everyone when they join — still yours to edit or remove"
            >
              <Pin size={10} aria-hidden="true" /> Shared
            </span>
          )}
        </span>
        <span className="hrow__meta">
          <span>{describe(habit, target)}</span>
          {slot && <span className="hrow__part">{slot.part}</span>}
          <span>
            {runDone}/7 this week
          </span>
        </span>
      </div>

      <div className="hrow__controls">
        {isCheck && isBad ? (
          // A bad habit needs an explicit tap either way: "avoided" has to be
          // logged, never assumed from silence.
          <>
            <button
              type="button"
              className="mark"
              style={{ '--mark-on': 'var(--plane-indigo)', '--mark-ink': 'var(--on-plane-black)' }}
              onClick={markAvoided}
              aria-pressed={logged && !done}
              aria-label={`${habit.label}: avoided today`}
              title="Avoided"
            >
              <Check size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mark mark--slip"
              onClick={markSlipped}
              aria-pressed={logged && done}
              aria-label={`${habit.label}: slipped today`}
              title="Slipped"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </>
        ) : isCheck ? (
          <button
            type="button"
            className="mark"
            style={{ '--mark-on': swatch, '--mark-ink': markInk }}
            onClick={() => set(done ? 0 : target)}
            aria-pressed={done}
            aria-label={`${habit.label}: done today`}
          >
            <Check size={22} aria-hidden="true" />
          </button>
        ) : (
          <div className="counter">
            <button
              type="button"
              className="counter__btn"
              onClick={() => set(value - 1)}
              aria-label={`One less ${habit.unit || 'unit'} of ${habit.label}`}
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="counter__value">
              {value}/{target}
              {habit.unit ? ` ${habit.unit}` : ''}
            </span>
            <button
              type="button"
              className="counter__btn"
              onClick={() => set(value + 1)}
              aria-label={`One more ${habit.unit || 'unit'} of ${habit.label}`}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            icon={<Pencil size={15} />}
            label={`Edit ${habit.label}`}
            onClick={() => setEditing(true)}
          />
        )}
        {onRemove && (
          <Button
            variant="ghost"
            icon={<X size={16} />}
            label={`Remove ${habit.label}`}
            onClick={() => {
              if (window.confirm(`Remove “${habit.label}”? Its history goes with it.`))
                onRemove(habit.id)
            }}
          />
        )}
      </div>

      {floats.map((f) => (
        <span key={f.id} className={`float-pts ${f.n < 0 ? 'float-pts--neg' : ''}`}>
          {f.n > 0 ? '+' : ''}
          {f.n}
        </span>
      ))}
    </li>
  )
}

// Inline edit — every field a habit has, including the ones the add form sets
// once and never again before this. Points are never rejected, only fitted.
function EditForm({ habit, pointTarget, usedByOthers, onCancel, onSave }) {
  const [label, setLabel] = useState(habit.label)
  const [color, setColor] = useState(habit.color)
  const [kind, setKind] = useState(habit.kind)
  const [badMode, setBadMode] = useState(habit.bad_mode || 'reward_avoid')
  const [points, setPoints] = useState(habit.points)
  const [target, setTarget] = useState(habit.target || 1)
  const [unit, setUnit] = useState(habit.unit || '')
  const [icon, setIcon] = useState(habit.icon)
  const [pickIcon, setPickIcon] = useState(false)
  const [saving, setSaving] = useState(false)
  const PickedIcon = iconComponent(icon)

  const remaining = Math.max(0, pointTarget - usedByOthers)
  const willFit = fitPoints(Number(points) || 1, usedByOthers, pointTarget)

  async function save(e) {
    e?.preventDefault()
    if (!label.trim()) return
    setSaving(true)
    try {
      await onSave({
        label: label.trim(),
        icon,
        color,
        kind,
        bad_mode: badMode,
        points: willFit,
        target: Number(target) || 1,
        unit,
        is_bank: unit === 'hours' || unit === 'glasses',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Field label="Name" id={`edit-label-${habit.id}`} value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <Button
          icon={<PickedIcon size={18} />}
          label={pickIcon ? 'Close icon picker' : 'Change icon'}
          aria-expanded={pickIcon}
          onClick={() => setPickIcon((s) => !s)}
        />
      </div>

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
              aria-label={c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Kind</legend>
        <div className="row">
          <label className="chip">
            <input type="radio" name={`kind-${habit.id}`} checked={kind === 'good'} onChange={() => setKind('good')} />
            Good habit
          </label>
          <label className="chip">
            <input type="radio" name={`kind-${habit.id}`} checked={kind === 'bad'} onChange={() => setKind('bad')} />
            Bad habit
          </label>
        </div>
      </fieldset>

      {kind === 'bad' ? (
        <Field label="How it scores" id={`edit-badmode-${habit.id}`}>
          <select
            className="field__control"
            id={`edit-badmode-${habit.id}`}
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
            id={`edit-target-${habit.id}`}
            type="number"
            min="1"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <Field label="Unit" id={`edit-unit-${habit.id}`} hint="Hours and glasses feed the Bank.">
            <select
              className="field__control"
              id={`edit-unit-${habit.id}`}
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
        id={`edit-points-${habit.id}`}
        type="number"
        min="1"
        inputMode="numeric"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        hint={
          willFit === Number(points)
            ? `${remaining} left of this room's ${pointTarget}-point target.`
            : `Will save as ${willFit} — that's what fits in this room's ${pointTarget}-point target.`
        }
      />

      <div className="row">
        <Button type="submit" variant="primary" loading={saving} disabled={!label.trim()}>
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function describe(habit, target) {
  const unit = habit.unit ? ' ' + habit.unit : ''
  if (habit.kind === 'good') {
    const freq = target > 1 ? `${target}${unit} a day` : 'Once a day'
    if (habit.penalty_if_skipped) return `${freq} · +${habit.points} / −${habit.points}`
    return `${freq} · +${habit.points}`
  }
  if (habit.bad_mode === 'reward_avoid') return `Avoid · +${habit.points} when clean`
  if (habit.bad_mode === 'penalty_do') return `Avoid · −${habit.points} if you slip`
  return `Avoid · ±${habit.points}`
}
