import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/rooms.js'

// The home screen: explain the game and let someone start a competition.
export default function Landing() {
  const navigate = useNavigate()
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
          Go head-to-head with a friend on your daily habits. Set up your own
          habits, tick them off each day, and watch both scores update live.
        </p>
      </header>

      <div className="card center">
        <h2>Start a competition</h2>
        <p className="muted">
          Creates a private room and an invite link you can send to one friend.
        </p>
        <button onClick={start} disabled={busy}>
          {busy ? 'Creating…' : 'Start a competition'}
        </button>
        {error && <p className="errline">{error}</p>}
      </div>

      <div className="features">
        <div className="feature">
          <span className="dot amber" />
          <b>Set your own habits</b>
          <span>Good habits earn points; bad ones cost you.</span>
        </div>
        <div className="feature">
          <span className="dot green" />
          <b>Head-to-head</b>
          <span>Two live progress bars, one clear leader.</span>
        </div>
        <div className="feature">
          <span className="dot indigo" />
          <b>Updates instantly</b>
          <span>Both screens sync the moment either of you ticks.</span>
        </div>
      </div>

      <footer>Two players · live scores · deploy free on Vercel</footer>
    </div>
  )
}
