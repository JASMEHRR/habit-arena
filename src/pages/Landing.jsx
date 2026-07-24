import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Users, ArrowRight, LogOut, Trash2, Mail } from 'lucide-react'
import { createRoom, listMyRooms, leaveRoom, deleteRoom, claimOldRooms } from '../lib/rooms.js'
import { signOut } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

// The home screen: explain the game and let someone start a competition.
export default function Landing() {
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [claimEmail, setClaimEmail] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')

  function refreshRooms() {
    return listMyRooms(session.user.id).then(setRooms).catch((e) => setError(e.message))
  }

  useEffect(() => {
    let alive = true
    listMyRooms(session.user.id)
      .then((r) => alive && setRooms(r))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoadingRooms(false))
    return () => { alive = false }
  }, [session.user.id])

  async function start() {
    setBusy(true)
    setError('')
    try {
      const code = await createRoom(session.user.id, profile)
      navigate(`/room/${code}`)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setBusy(false)
    }
  }

  async function claim() {
    if (!claimEmail.trim()) return
    setClaiming(true); setClaimMsg('')
    try {
      const n = await claimOldRooms(claimEmail)
      if (n > 0) {
        setClaimMsg(`Recovered ${n} room${n > 1 ? 's' : ''} — check "Your rooms" below.`)
        setClaimEmail('')
        await refreshRooms()
      } else {
        setClaimMsg('No rooms found with that email attached.')
      }
    } catch (e) {
      setClaimMsg(e.message)
    } finally {
      setClaiming(false)
    }
  }

  async function onLeave(e, r) {
    e.preventDefault()
    if (!window.confirm(`Leave ${r.name ? `${r.name}'s room` : 'this room'}? Your habits and history in it will be deleted.`)) return
    try {
      await leaveRoom(r.playerId)
      setRooms((rs) => rs.filter((x) => x.roomId !== r.roomId))
    } catch (e) { setError(e.message) }
  }

  async function onDelete(e, r) {
    e.preventDefault()
    if (!window.confirm(`Delete ${r.name ? `${r.name}'s room` : 'this room'} for everyone? This cannot be undone.`)) return
    try {
      await deleteRoom(r.roomId)
      setRooms((rs) => rs.filter((x) => x.roomId !== r.roomId))
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="wrap">
      <header className="landing-head">
        <div>
          <h1>🏆 Habit Arena</h1>
          <p className="sub">
            Compete with your friends on your daily habits. Everyone sets up their
            own habits, ticks them off each day, and climbs a live group
            leaderboard — with streaks, stats, and trash talk.
          </p>
        </div>
        <button className="ghost signout-btn" onClick={signOut}>
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <div className="card center">
        <h2>Start a competition</h2>
        <p className="muted">
          Creates a room and an invite link you can share with your whole crew.
        </p>
        <button onClick={start} disabled={busy}>
          {busy ? 'Creating…' : 'Start a competition'}
        </button>
        {error && <p className="errline">{error}</p>}
      </div>

      <div className="card">
        <div className="import-head"><Mail size={16} className="i-amber" /><b>Had a room before accounts existed?</b></div>
        <p className="muted small">
          If an old room had your email attached, enter it here to re-link it to this account.
        </p>
        <div className="addrow">
          <input type="email" placeholder="your@email.com" value={claimEmail}
            onChange={(e) => setClaimEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && claim()} />
          <button onClick={claim} disabled={claiming}>{claiming ? 'Checking…' : 'Recover rooms'}</button>
        </div>
        {claimMsg && <p className="muted small stack-sm">{claimMsg}</p>}
      </div>

      {/* The card renders even with no rooms, so a new account sees a
          deliberate empty state instead of the section silently vanishing. */}
      {!loadingRooms && rooms.length === 0 && (
        <div className="card">
          <h2>Your rooms</h2>
          <div className="empty-state">
            <b>No rooms yet</b>
            Start a competition above, or open an invite link from a friend to join theirs.
          </div>
        </div>
      )}

      {!loadingRooms && rooms.length > 0 && (
        <div className="card">
          <h2>Your rooms</h2>
          <ul className="room-list">
            {rooms.map((r) => (
              <li key={r.roomId}>
                <Link to={`/room/${r.code}`}>
                  <Users size={16} />
                  <span className="room-name">{r.name ? `${r.name}'s room` : 'Room'}</span>
                  <code>{r.code}</code>
                  <ArrowRight size={16} className="room-go" />
                </Link>
                <span className="room-actions">
                  <button className="ghost" title="Leave room" onClick={(e) => onLeave(e, r)}><LogOut size={14} /></button>
                  {r.isCreator && (
                    <button className="ghost" title="Delete room for everyone" onClick={(e) => onDelete(e, r)}><Trash2 size={14} /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="features">
        <div className="feature">
          <span className="dot amber" />
          <b>Set your own habits</b>
          <span>Good habits earn points; bad ones cost you.</span>
        </div>
        <div className="feature">
          <span className="dot green" />
          <b>Group leaderboard</b>
          <span>Unlimited friends, ranked live with streaks and medals.</span>
        </div>
        <div className="feature">
          <span className="dot indigo" />
          <b>Stats & chat</b>
          <span>Rings, charts, a sleep bank, and a room chat to cheer or taunt.</span>
        </div>
      </div>

      <footer>Group competition · live scores · deploy free on Vercel</footer>
    </div>
  )
}
