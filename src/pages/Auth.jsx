import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signUp, requestPasswordReset } from '../lib/auth.js'
import { AVATAR_TOKENS, DEFAULT_AVATAR } from '../avatars.js'
import { Avatar, Button, Field } from '../components/ui/Primitives.jsx'
import { PlanePortrait } from '../components/PlanePortrait.jsx'

// The indigo field the poster half is printed on. Passed to the figure so no
// plane is painted in the ground's own colour and lost. Mirrors --plane-indigo.
const POSTER_GROUND = '#1e3a8a'

const COPY = {
  signin: { title: 'Welcome back', sub: 'Sign in to see your rooms.', cta: 'Sign in' },
  signup: {
    title: 'Make your account',
    sub: 'One account, used in every room you join.',
    cta: 'Create account',
  },
  forgot: {
    title: 'Reset your password',
    sub: "Enter your email and we'll send a link to set a new one.",
    cta: 'Send reset link',
  },
}

// Demonstration habits, purely so the poster's figure is a real assembled
// portrait rather than an empty frame. Synthetic — no claim is made about
// anybody's actual usage, and there are no invented user counts or testimonials
// anywhere on this screen. The old version showed three fabricated marketing
// tiles ("Daily / Live / Streaks"), which existed only to fill a layout gap.
const DEMO_HABITS = [
  { id: 'd1', label: 'Sleep on time', points: 5, color: '#111111' },
  { id: 'd2', label: 'Exercise', points: 5, color: '#e43d24' },
  { id: 'd3', label: 'Drink water', points: 5, color: '#c8a24b' },
  { id: 'd4', label: 'Read', points: 3, color: '#1e3a8a' },
  { id: 'd5', label: 'No doomscrolling', points: 3, color: '#1e3a8a' },
  { id: 'd6', label: 'Journal', points: 2, color: '#e43d24' },
]

export default function Auth({ mode: initialMode = 'signin' }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function go(next) {
    setMode(next)
    setError('')
    setNotice('')
    // Each mode has a URL now, so the browser's back button behaves and a
    // sign-up link can be shared.
    navigate(next === 'signin' ? '/signin' : next === 'signup' ? '/signup' : '/forgot')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter the name your friends will see.')
        const session = await signUp(email, password, name.trim(), avatar)
        if (!session) setNotice('Check your email to confirm your account, then sign in.')
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        // Worded to reveal nothing about whether the address is registered.
        setNotice(
          'If that email has an account, a reset link is on its way. Check your inbox and your spam folder.'
        )
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = COPY[mode]

  return (
    <div className="gate">
      {/* The poster half. The figure is at the scale the form has in life —
          monumental, bleeding off two edges — not a shape trapped in a card. */}
      <div className="gate__poster">
        <span className="wordmark" style={{ position: 'relative' }}>
          <span className="wordmark__mark" aria-hidden="true" />
          <span className="wordmark__text">Habit Arena</span>
        </span>

        <div className="gate__figure" aria-hidden="true">
          <PlanePortrait habits={DEMO_HABITS} isOn={() => true} label="" avoid={POSTER_GROUND} />
        </div>

        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <h1 className="gate__hero">Your day, as one picture.</h1>
          <p className="gate__lede">
            Pick your habits. Every one you keep lands a plane of your portrait,
            and everyone in your room plays for the same daily point target.
          </p>
        </div>
      </div>

      <div className="gate__panel">
        <div className="gate__panel-inner">
          <h2 style={{ fontSize: 'var(--fs-xl)' }}>{copy.title}</h2>
          <p className="quiet" style={{ margin: 'var(--space-2) 0 var(--space-5)' }}>
            {copy.sub}
          </p>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <>
                <fieldset>
                  <legend>Pick your mark</legend>
                  <div className="picker-grid picker-grid--marks" style={{ maxWidth: 360 }}>
                    {AVATAR_TOKENS.map((t, i) => (
                      <button
                        key={t}
                        type="button"
                        className="chip"
                        aria-pressed={t === avatar}
                        aria-label={`Mark option ${i + 1}`}
                        onClick={() => setAvatar(t)}
                      >
                        <Avatar name={name || '?'} seed={t} size="sm" />
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Field
                  label="Your name"
                  id="auth-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  hint="What your friends will see on the board."
                  required
                  maxLength={40}
                />
              </>
            )}

            <Field
              label="Email"
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            {mode !== 'forgot' && (
              <Field
                label="Password"
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // Without these, password managers guessed — and guessed wrong
                // between "save a new one" and "fill the existing one".
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
                required
              />
            )}

            {error && (
              <p className="field__error" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </p>
            )}
            {/* A confirmation and a failure no longer share one grey style. */}
            {notice && (
              <p className="callout small" role="status" style={{ marginBottom: 'var(--space-4)' }}>
                {notice}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" block loading={busy}>
              {copy.cta}
            </Button>
          </form>

          {mode === 'signin' && (
            <button type="button" className="textlink" style={{ marginTop: 'var(--space-4)' }} onClick={() => go('forgot')}>
              Forgot your password?
            </button>
          )}

          <div className="divider">or</div>

          <Button
            block
            onClick={() => go(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signup'
              ? 'I already have an account'
              : mode === 'forgot'
                ? 'Back to sign in'
                : 'Create a new account'}
          </Button>
        </div>
      </div>
    </div>
  )
}
