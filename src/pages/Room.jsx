import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  loadRoomState, joinRoom, subscribeRoom, savedPlayerId, setEntry,
} from '../lib/rooms.js'
import { todayStr } from '../scoring.js'
import HabitSetup from '../components/HabitSetup.jsx'
import PlayerColumn from '../components/PlayerColumn.jsx'

export default function Room() {
  const { code } = useParams()
  const [state, setState] = useState(null) // { room, players, doneByHabit, date }
  const [status, setStatus] = useState('loading') // loading | notfound | ready | error
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  // Reload the whole room from Supabase. Used on mount and on every realtime event.
  const reload = useCallback(async () => {
    try {
      const s = await loadRoomState(code, todayStr())
      if (!s) {
        setStatus('notfound')
        return
      }
      setState(s)
      setStatus('ready')
    } catch (e) {
      setError(e.message || 'Failed to load room.')
      setStatus('error')
    }
  }, [code])

  useEffect(() => {
    reload()
    const unsub = subscribeRoom(reload) // live updates for both players
    return unsub
  }, [reload])

  if (status === 'loading') return <Centered>Loading…</Centered>
  if (status === 'notfound') return <Centered>Room not found. Check the invite link.</Centered>
  if (status === 'error') return <Centered>{error}</Centered>

  const { room, players, doneByHabit } = state
  const myId = savedPlayerId(room.id)
  const me = players.find((p) => p.id === myId) || null

  // Not yet a member of this room on this device -> show the join prompt.
  if (!me) {
    if (players.length >= 2) {
      return <Centered>This room is full (2 players). Ask your friend to start a new one.</Centered>
    }
    async function join() {
      if (!name.trim()) return
      setJoining(true)
      setError('')
      try {
        await joinRoom(code, name.trim())
        await reload()
      } catch (e) {
        setError(e.message)
        setJoining(false)
      }
    }
    return (
      <div className="wrap">
        <header>
          <h1>🏆 Habit Arena</h1>
          <p className="sub">You've been invited to a habit competition. Enter your name to join.</p>
        </header>
        <div className="card center">
          <h2>Join the arena</h2>
          <div className="addrow">
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
            />
            <button onClick={join} disabled={joining}>{joining ? 'Joining…' : 'Join'}</button>
          </div>
          {error && <p className="errline">{error}</p>}
        </div>
      </div>
    )
  }

  // I'm a member. If I haven't set up any habits yet, show the setup form.
  const needsSetup = me.habits.length === 0

  const inviteUrl = `${window.location.origin}/room/${code}`
  function copyLink() {
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  async function toggle(habitId, done) {
    // Optimistic update so the tick feels instant; realtime confirms it.
    setState((s) => ({ ...s, doneByHabit: { ...s.doneByHabit, [habitId]: done } }))
    try {
      await setEntry(habitId, state.date, done)
    } catch (e) {
      setError(e.message)
      reload() // revert to server truth on failure
    }
  }

  // Order columns so the viewer is on the left.
  const ordered = [me, ...players.filter((p) => p.id !== me.id)]

  return (
    <div className="wrap wide">
      <header>
        <h1>🏆 Habit Arena</h1>
        <div className="invite">
          <span className="muted">Invite link:</span>
          <code>{inviteUrl}</code>
          <button className="copy-link" onClick={copyLink}>
            {copied ? 'Copied ✓' : 'Copy invite link'}
          </button>
        </div>
        {players.length < 2 && (
          <p className="sub">Waiting for player 2 to join with the link above…</p>
        )}
      </header>

      {needsSetup ? (
        <HabitSetup player={me} onChanged={reload} />
      ) : (
        <div className="arena">
          {ordered.map((p) => (
            <PlayerColumn
              key={p.id}
              player={p}
              doneByHabit={doneByHabit}
              editable={p.id === me.id}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {!needsSetup && (
        <details className="more">
          <summary>Add more habits</summary>
          <HabitSetup player={me} onChanged={reload} />
        </details>
      )}

      <footer>Room {code} · scores update live for both players</footer>
    </div>
  )
}

function Centered({ children }) {
  return (
    <div className="wrap">
      <div className="card center">{children}</div>
    </div>
  )
}
