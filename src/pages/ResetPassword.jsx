import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Field, Loading } from '../components/ui/Primitives.jsx'
import { PlanePortrait } from '../components/PlanePortrait.jsx'

// Landing page for the recovery link in the password-reset email.
//
// Supabase's `detectSessionInUrl` (on by default) reads the token out of the URL
// and establishes a session, then fires an auth-state change that AuthContext
// picks up. That parsing is asynchronous and can finish *after* the initial
// getSession() resolves, so a naive `if (!session) → invalid` check flashes an
// error before flipping to valid. The grace timer waits for that to settle.
const LINK_GRACE_MS = 2500

// The indigo field the poster half is printed on. Passed to the figure so no
// plane is painted in the ground's own colour and lost. Mirrors --plane-indigo.
const POSTER_GROUND = '#1e3a8a'

// Synthetic, and only here so the poster half has an assembled figure.
const DEMO_HABITS = [
  { id: 'd1', label: 'Sleep on time', points: 5, color: '#111111' },
  { id: 'd2', label: 'Exercise', points: 5, color: '#e43d24' },
  { id: 'd3', label: 'Drink water', points: 5, color: '#c8a24b' },
  { id: 'd4', label: 'Read', points: 3, color: '#1e3a8a' },
]

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
    if (password.length < 6) return setError('Use at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await changePassword(password)
      setDone(true)
      // The recovery session is a real session, so there is nothing further to
      // sign in to — drop them straight into the app.
      setTimeout(() => navigate('/', { replace: true }), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const checking = loading || (!session && !graceExpired)

  return (
    <div className="gate">
      <div className="gate__poster">
        <span className="wordmark" style={{ position: 'relative' }}>
          <span className="wordmark__mark" aria-hidden="true" />
          <span className="wordmark__text">Habit Arena</span>
        </span>
        <div className="gate__figure" aria-hidden="true">
          <PlanePortrait habits={DEMO_HABITS} isOn={() => true} label="" avoid={POSTER_GROUND} />
        </div>
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <h1 className="gate__hero">Set a new password.</h1>
          <p className="gate__lede">
            You will be signed straight back in once it is saved.
          </p>
        </div>
      </div>

      <div className="gate__panel">
        <div className="gate__panel-inner">
          {checking && <Loading label="Checking your reset link" lines={3} />}

          {!checking && !session && (
            <>
              <h2 style={{ fontSize: 'var(--fs-xl)' }}>This link didn't work</h2>
              <p className="quiet" style={{ margin: 'var(--space-2) 0 var(--space-5)' }}>
                Reset links expire after a short while and can only be used once.
                Request a fresh one and try again.
              </p>
              <Button variant="primary" size="lg" block onClick={() => navigate('/', { replace: true })}>
                Back to sign in
              </Button>
            </>
          )}

          {!checking && session && !done && (
            <>
              <h2 style={{ fontSize: 'var(--fs-xl)' }}>Choose a new password</h2>
              <p className="quiet" style={{ margin: 'var(--space-2) 0 var(--space-5)' }}>
                Resetting the password for {session.user.email}.
              </p>
              <form onSubmit={submit}>
                <Field
                  label="New password"
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  hint="At least 6 characters."
                  required
                  autoFocus
                />
                <Field
                  label="Confirm new password"
                  id="reset-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  error={error || undefined}
                  required
                />
                <Button type="submit" variant="primary" size="lg" block loading={busy}>
                  Save password
                </Button>
              </form>
            </>
          )}

          {done && (
            <div role="status">
              <h2 style={{ fontSize: 'var(--fs-xl)' }}>Password updated</h2>
              <p className="quiet" style={{ marginTop: 'var(--space-2)' }}>
                Taking you to your rooms…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
