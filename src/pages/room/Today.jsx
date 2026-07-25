import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRoom } from './RoomProvider.jsx'
import { PlanePortrait } from '../../components/PlanePortrait.jsx'
import HabitRoster, { planeOn } from '../../components/HabitRoster.jsx'
import HabitSetup from '../../components/HabitSetup.jsx'
import CopyHabits from '../../components/CopyHabits.jsx'
import ImportHabits from '../../components/ImportHabits.jsx'
import BankMeter from '../../components/BankMeter.jsx'
import { Button, Sheet, Stat } from '../../components/ui/Primitives.jsx'
import { dayCompletion, streak, playerBankDebt, dayCompletion as dc, rankedIds } from '../../stats.js'
import { useCountUp } from '../../hooks.js'

export default function Today() {
  const { state, me, pointTarget, setValue, removeHabit, editHabit, deleteEntry, reload } = useRoom()
  const { entriesByHabit, days, date, players } = state
  const [adding, setAdding] = useState(false)

  const comp = dayCompletion(me.habits, entriesByHabit, date)
  const debt = playerBankDebt(me.habits, entriesByHabit, days)
  const streakVal = streak(me.habits, entriesByHabit, days)
  const rank = rankedIds(players, entriesByHabit, days).indexOf(me.id) + 1
  const shown = useCountUp(comp.earned)

  if (me.habits.length === 0) return <FirstRun onDone={reload} />

  const last7 = days.slice(-7)

  return (
    <>
      <div className="page-head">
        <p className="caption">{longDate(date)}</p>
        <h1 className="page-head__title">Your day</h1>
      </div>

      {/* The poster: the figure, and the score in its margin. */}
      <div className="poster">
        <PlanePortrait
          habits={me.habits}
          isOn={(h) => planeOn(h, entriesByHabit, date)}
          onToggle={(h) => toggle(h, entriesByHabit, date, setValue, deleteEntry)}
          label={describeFigure(me.habits, entriesByHabit, date, comp)}
        />

        <div className="poster__margin">
          <div>
            <span className="score__label">Earned today</span>
            <p className="score">
              <span className={`score__value ${comp.earned < 0 ? 'score__value--neg' : ''}`}>
                {shown}
              </span>
              <span className="score__of">of {comp.max}</span>
            </p>
            {comp.earned < 0 && (
              <p className="quiet small measure">
                Below zero because the shared habits cost their points when
                skipped. Marking them brings it straight back up.
              </p>
            )}
          </div>

          <p className="quiet small measure">
            {comp.pct >= 100
              ? 'Every plane has landed. The figure is complete.'
              : `${remainingCount(me.habits, entriesByHabit, date)} ${
                  remainingCount(me.habits, entriesByHabit, date) === 1 ? 'plane' : 'planes'
                } still missing. Tap one on the figure, or use the list below.`}
          </p>

          <div className="row" style={{ gap: 'var(--space-6)' }}>
            <Stat label="Streak" value={`${streakVal}d`} />
            <Stat label="Rank" value={`#${rank}`} foot={`of ${players.length}`} />
          </div>

          <div>
            <span className="score__label">Last 7 days</span>
            <div className="run" style={{ marginTop: 'var(--space-2)' }} role="img" aria-label={runLabel(me.habits, entriesByHabit, last7)}>
              {last7.map((d) => {
                const pct = dc(me.habits, entriesByHabit, d).pct
                return (
                  <span
                    key={d}
                    className={`run__cell ${pct >= 100 ? 'run__cell--on' : pct > 0 ? 'run__cell--part' : ''}`}
                    title={`${d}: ${Math.round(pct)}%`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <Sheet quiet className="section--tight" title="Habits" action={
        <Button icon={<Plus size={16} />} label="Add a habit" aria-expanded={adding} onClick={() => setAdding((v) => !v)} />
      }>
        <HabitRoster
          habits={me.habits}
          entriesByHabit={entriesByHabit}
          days={days}
          today={date}
          pointTarget={pointTarget}
          onSetValue={setValue}
          onRemove={removeHabit}
          onEdit={editHabit}
        />
      </Sheet>

      {adding && (
        <div className="stack section--tight" style={{ marginTop: 'var(--space-5)', '--stack': 'var(--space-5)' }}>
          <HabitSetup player={me} pointTarget={pointTarget} onChanged={reload} />
          <ImportHabits player={me} pointTarget={pointTarget} onChanged={reload} />
        </div>
      )}

      <div className="section--tight" style={{ marginTop: 'var(--space-6)' }}>
        <BankMeter debt={debt} />
      </div>
    </>
  )
}

// A plane has exactly one meaning: it lands, or it comes off. Nothing else.
//
// It used to cycle a bad habit avoided → slipped → avoided, so a mistap on the
// figure moved you into a *penalised* state with no route back, and the plane's
// pressed state could not say which of the two it had just chosen. Slipping is a
// deliberate admission, so it stays an explicit choice in the roster; the figure
// only ever toggles whether the plane is there.
function toggle(habit, entriesByHabit, date, setValue, clearEntry) {
  const target = habit.target || 1
  const entry = entriesByHabit[habit.id]?.[date]
  const done = (entry?.value ?? 0) >= target
  const landed = entry !== undefined && (habit.kind === 'bad' ? !done : done)

  if (landed) {
    // Taking a plane off a bad habit means un-logging it, not confessing to a
    // slip — a bad habit's "0" is the credit, so there is nothing lower to set.
    if (habit.kind === 'bad') clearEntry(habit.id, date)
    else setValue(habit.id, 0, target)
    return
  }
  setValue(habit.id, habit.kind === 'bad' ? 0 : target, target)
}

function remainingCount(habits, entriesByHabit, date) {
  return habits.filter((h) => !planeOn(h, entriesByHabit, date)).length
}

// The figure is an <svg role="img">, so it needs a real description. Colour and
// shape carry the meaning visually; this carries it in words.
function describeFigure(habits, entriesByHabit, date, comp) {
  const landed = habits.filter((h) => planeOn(h, entriesByHabit, date))
  if (landed.length === 0) {
    return `Your day as a portrait: no planes landed yet, so the figure is blank paper. ${habits.length} habits to mark.`
  }
  return `Your day as a portrait: ${landed.length} of ${habits.length} planes landed (${landed
    .map((h) => h.label)
    .join(', ')}). ${Math.round(comp.pct)} per cent of today complete.`
}

function runLabel(habits, entriesByHabit, days) {
  const full = days.filter((d) => dc(habits, entriesByHabit, d).pct >= 100).length
  return `Last ${days.length} days: ${full} completed in full.`
}

function longDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ---- first run ----
// A brand new player used to land on an empty ring reading 0% next to three
// stacked setup panels, one of which asked them to go and use a different
// product. This asks one question instead: which habits are yours?
function FirstRun({ onDone }) {
  const { state, me, pointTarget, reload } = useRoom()

  return (
    <>
      <div className="page-head">
        <p className="caption">Room {state.room.code} · {state.players.length}{' '}
          {state.players.length === 1 ? 'player' : 'players'}</p>
        <h1 className="page-head__title">Build your figure</h1>
        <p className="page-head__sub">
          This room's daily target is {pointTarget} points, the same for every
          player — adding a habit that would push you over it just shrinks that
          habit's points to fit, so you're never blocked. Each habit becomes one
          plane of your portrait — mark it and the plane lands.
        </p>
      </div>

      <div className="poster" style={{ marginBottom: 'var(--space-7)' }}>
        <PlanePortrait
          habits={me.habits}
          isOn={() => false}
          label="An empty portrait. Add habits and each becomes one plane."
        />
        <div className="poster__margin">
          {/* This screen only renders when there are no habits at all, so it must
              not claim the shared ones are already in place. */}
          <p className="quiet measure">
            Right now it is blank paper. Add your first habits below and the
            figure starts assembling; a complete day is a complete portrait.
          </p>
        </div>
      </div>

      <HabitSetup player={me} pointTarget={pointTarget} onChanged={onDone || reload} />
      <CopyHabits currentRoomId={state.room.id} player={me} pointTarget={pointTarget} onChanged={onDone || reload} />
      <div style={{ marginTop: 'var(--space-5)' }}>
        <ImportHabits player={me} pointTarget={pointTarget} onChanged={onDone || reload} />
      </div>
    </>
  )
}
