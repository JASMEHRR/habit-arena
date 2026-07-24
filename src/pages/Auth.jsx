import { useState } from 'react'
import { signIn, signUp } from '../lib/auth.js'

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐳', '🦩', '⚡', '🔥', '🌟', '🚀']

// Gate in front of the whole app: sign in, or sign up with a display name
// and avatar that become your global profile (reused in every room).
export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
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
      </div>
      <div className="login-right">
        <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <div className="sub">
          {mode === 'signup' ? 'One account, usable across every room you join.' : 'Sign in to see your rooms.'}
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <div className="avatar-grid avatar-pick">
                {AVATARS.map((a) => (
                  <button key={a} type="button" className={'avatar-opt ava' + (a === avatar ? ' selected on' : '')} onClick={() => setAvatar(a)}>{a}</button>
                ))}
              </div>
              <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <input className="field" type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" className={'btn-primary' + (busy ? ' loading' : '')} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
          </button>
        </form>

        {confirmMsg && <p className="muted small" style={{ marginTop: 8 }}>{confirmMsg}</p>}
        {error && <p className="errline">{error}</p>}

        <div className="divider">or</div>
        <button className="btn-outline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setConfirmMsg('') }}>
          {mode === 'signup' ? 'I already have an account' : 'Create a new account'}
        </button>
      </div>
    </div>
  )
}
