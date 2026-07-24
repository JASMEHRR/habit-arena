import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { createRoom, savedRooms } from '../lib/rooms.js'

// The home screen: explain the game and let someone start a competition.
export default function Landing() {
  const navigate = useNavigate()
  const rooms = savedRooms()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setBusy(true)
    setError('')
    try {
      const code = await createRoom()
      navigate(`/room/${code}`) // creator becomes player 1 on the room page
    } catch (e) {
      setError(e.message || 'Something went wrong. Is your .env set up?')
      setBusy(false)
    }
  }

  return (
    <div className="wrap">
      <header>
        <h1>🏆 Habit Arena</h1>
        <p className="sub">
          Compete with your friends on your daily habits. Everyone sets up their
          own habits, ticks them off each day, and climbs a live group
          leaderboard — with streaks, stats, and trash talk.
        </p>
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

      {rooms.length > 0 && (
        <div className="card">
          <h2>Your rooms</h2>
          <ul className="room-list">
            {rooms.slice().reverse().map((r) => (
              <li key={r.roomId}>
                <Link to={`/room/${r.code}`}>
                  <Users size={16} />
                  <span className="room-name">{r.name ? `${r.name}'s room` : 'Room'}</span>
                  <code>{r.code}</code>
                  <ArrowRight size={16} className="room-go" />
                </Link>
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
