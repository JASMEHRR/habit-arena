import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'

// Landing page for the recovery link in the password-reset email.
//
// Supabase's `detectSessionInUrl` (on by default) reads the token out of the
// URL and establishes a session, then fires an auth-state change that
// AuthContext picks up. That parsing is asynchronous and can finish *after*
// the initial getSession() call resolves, so a naive `if (!session) → invalid`
// check flashes an error before flipping to valid. The grace timer below waits
// for that to settle before calling the link bad.
const LINK_GRACE_MS = 2500

export default function ResetPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [graceExpired, setGraceExpired] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setGraceExpired(true), LINK_GRACE_MS)
    return () => clearTimeout(t)
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await changePassword(password)
      setDone(true)
      // The recovery session is a real session, so there is nothing further to
      // sign in to — drop them straight into the app.
      setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const checking = loading || (!session && !graceExpired)

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="brand"><div className="brand-icon">🏆</div>Habit Arena</div>
        <div className="login-hero">
          <h1>Set a new<br /><span>password.</span></h1>
          <p>Pick something you'll remember this time. You'll be signed straight back in once it's saved.</p>
        </div>
        {/* Third child of .login-left — matches Auth.jsx so the two screens
            compose identically instead of leaving a dead zone here. */}
        <div className="login-stats">
          <div className="login-stat"><div className="num">Daily</div><div className="lbl">habit scoring</div></div>
          <div className="login-stat"><div className="num">Live</div><div className="lbl">room leaderboard</div></div>
          <div className="login-stat"><div className="num">Streaks</div><div className="lbl">tracked for you</div></div>
        </div>
      </div>

      <div className="login-right">
        {checking && (
          <>
            <h2>Checking your link…</h2>
            <div className="sub">One moment while we verify the reset link.</div>
          </>
        )}

        {!checking && !session && (
          <>
            <h2>This link didn't work</h2>
            <div className="sub">
              Reset links expire after a short while and can only be used once.
              Request a fresh one and try again.
            </div>
            <button className="btn-primary" onClick={() => navigate('/', { replace: true })}>
              Back to sign in →
            </button>
          </>
        )}

        {!checking && session && !done && (
          <>
            <h2>Choose a new password</h2>
            <div className="sub">Resetting the password for {session.user.email}.</div>
            <form onSubmit={submit}>
              <input className="input" type="password" placeholder="New password" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />
              <input className="input" type="password" placeholder="Confirm new password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
              <button type="submit" className={'btn-primary' + (busy ? ' loading' : '')} disabled={busy}>
                {busy ? 'Saving…' : 'Save password →'}
              </button>
            </form>
            {error && <p className="errline">{error}</p>}
          </>
        )}

        {done && (
          <>
            <h2>Password updated</h2>
            <div className="sub">Taking you to your rooms…</div>
          </>
        )}
      </div>
    </div>
  )
}
