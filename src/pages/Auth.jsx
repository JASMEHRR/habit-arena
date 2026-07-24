import { useState } from 'react'
import { signIn, signUp, requestPasswordReset } from '../lib/auth.js'

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐳', '🦩', '⚡', '🔥', '🌟', '🚀']

const COPY = {
  signin: { title: 'Welcome back', sub: 'Sign in to see your rooms.' },
  signup: { title: 'Create your account', sub: 'One account, usable across every room you join.' },
  forgot: { title: 'Reset your password', sub: "Enter your email and we'll send you a link to set a new one." },
}

// Gate in front of the whole app: sign in, or sign up with a display name
// and avatar that become your global profile (reused in every room).
export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setConfirmMsg(''); setBusy(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Enter a display name.')
        const session = await signUp(email, password, name, avatar)
        if (!session) setConfirmMsg('Check your email to confirm your account, then sign in.')
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        // Worded so it reveals nothing about whether the address is registered.
        setConfirmMsg('If that email has an account, a reset link is on its way. Check your inbox and your spam folder.')
      } else {
        await signIn(email, password)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="brand"><div className="brand-icon">🏆</div>Habit Arena</div>
        <div className="login-hero">
          <h1>Compete on your<br /><span>daily habits.</span></h1>
          <p>Set your own habits, tick them off, and climb a live leaderboard with your crew — streaks, stats, and trash talk included.</p>
        </div>
        {/* Third child of .login-left — without it the panel's space-between
            layout leaves a dead zone in the middle. These describe what the
            app does; there is no session yet, so there are no real numbers
            to show here (unlike the room join screen, which has live ones). */}
        <div className="login-stats">
          <div className="login-stat"><div className="num">Daily</div><div className="lbl">habit scoring</div></div>
          <div className="login-stat"><div className="num">Live</div><div className="lbl">room leaderboard</div></div>
          <div className="login-stat"><div className="num">Streaks</div><div className="lbl">tracked for you</div></div>
        </div>
      </div>
      <div className="login-right">
        <h2>{COPY[mode].title}</h2>
        <div className="sub">{COPY[mode].sub}</div>

        {/* .auth-form holds the height of the tallest mode (sign-up) so the
            panel doesn't jump when toggling sign-in / sign-up / forgot. */}
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <div className="avatar-grid">
                {AVATARS.map((a) => (
                  <button key={a} type="button" aria-pressed={a === avatar}
                    className={'avatar-opt' + (a === avatar ? ' selected' : '')} onClick={() => setAvatar(a)}>{a}</button>
                ))}
              </div>
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <input className="input" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          {mode !== 'forgot' && (
            <input className="input" type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          )}
          {mode === 'signin' && (
            <button type="button" className="link-btn"
              onClick={() => { setMode('forgot'); setError(''); setConfirmMsg('') }}>
              Forgot password?
            </button>
          )}
          <button type="submit" className={'btn-primary' + (busy ? ' loading' : '')} disabled={busy}>
            {busy ? 'Please wait…'
              : mode === 'signup' ? 'Create account →'
              : mode === 'forgot' ? 'Send reset link →'
              : 'Sign in →'}
          </button>
        </form>

        {confirmMsg && <p className="muted small stack-sm">{confirmMsg}</p>}
        {error && <p className="errline">{error}</p>}

        <div className="divider">or</div>
        <button className="btn-outline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setConfirmMsg('') }}>
          {mode === 'signup' ? 'I already have an account'
            : mode === 'forgot' ? 'Back to sign in'
            : 'Create a new account'}
        </button>
      </div>
    </div>
  )
}
