import { useState } from 'react'
import { Check, Plus, Minus, X } from 'lucide-react'
import { iconComponent } from '../icons.js'
import { habitPoints } from '../scoring.js'
import { dayValue, historyDots } from '../stats.js'

// A single habit as a colored block card (Loop Habit Tracker style):
// icon + title + description, count/target (with + for extra reps), a
// dot-history strip of recent days, a satisfying tick, and floating points.
export default function HabitCard({ habit, entriesByHabit, days, today, onSetValue, onRemove }) {
  const Icon = iconComponent(habit.icon)
  const value = dayValue(entriesByHabit, habit.id, today)
  const target = habit.target || 1
  const done = value >= target
  const numeric = habit.is_bank || !!habit.unit // sleep/water: log an amount
  const dots = historyDots(entriesByHabit, habit.id, days, 20)
  const [floats, setFloats] = useState([]) // floating "+N" bubbles

  const points = habitPoints(habit, true)

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

  // Simple check habit (once a day, non-numeric): tap toggles done.
  const isCheck = target === 1 && !numeric

  return (
    <div className="hcard" style={{ '--habit': habit.color }}>
      <button className="hcard-remove" onClick={() => onRemove(habit.id)} title="Remove habit">
        <X size={14} />
      </button>

      <div className="hcard-main">
        <span className="hcard-icon"><Icon size={22} /></span>
        <div className="hcard-text">
          <h3>{habit.label}</h3>
          <p>{describe(habit, target)}</p>
        </div>

        {isCheck ? (
          <button
            className={'tick' + (done ? ' on' : '')}
            onClick={() => set(done ? 0 : target)}
            aria-pressed={done}
          >
            <Check size={22} />
          </button>
        ) : (
          <div className="counter">
            <button onClick={() => set(value - 1)} aria-label="minus"><Minus size={16} /></button>
            <span className="count">
              {value}/{target}{value > target ? '' : ''}
              {value >= target ? <em className="ext">+</em> : null}
            </span>
            <button onClick={() => set(value + 1)} aria-label="plus"><Plus size={16} /></button>
          </div>
        )}

        {floats.map((f) => (
          <span key={f.id} className="float-pts">+{f.n}</span>
        ))}
      </div>

      {/* recent-days dot strip */}
      <div className="dot-strip" aria-hidden="true">
        {dots.map((d, i) => (
          <span key={i} className={'dot' + (d ? ' filled' : '')} />
        ))}
      </div>
    </div>
  )
}

function describe(habit, target) {
  const unit = habit.unit ? ' ' + habit.unit : ''
  if (habit.kind === 'good') {
    const freq = target > 1 ? `${target}${unit} a day` : 'Once a day'
    return `${freq} · +${habit.points} pts`
  }
  if (habit.bad_mode === 'reward_avoid') return `Avoid it · +${habit.points} when clean`
  if (habit.bad_mode === 'penalty_do') return `Don't do it · −${habit.points} if you slip`
  return `Avoid it · ±${habit.points}`
}
