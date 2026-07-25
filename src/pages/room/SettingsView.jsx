import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useRoom } from './RoomProvider.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { updateProfile, changePassword, signOut } from '../../lib/auth.js'
import { AVATAR_TOKENS } from '../../avatars.js'
import { Avatar, Button, Field, Sheet } from '../../components/ui/Primitives.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

// Account settings.
//
// The old version had no <form> (so no Enter to submit and no native
// validation), no labels on any of its four controls, no autoComplete, and one
// Save button that performed two independent mutations — profile and password —
// through a single shared error slot. It also changed a password with no confirm
// field, while the reset-password screen required one.
//
// Now: two forms, two submits, two error slots, a confirm field, real labels.
export default function SettingsView() {
  const { state, pointTarget, updatePointTarget, reload } = useRoom()
  const { session, profile, refreshProfile } = useAuth()
  const toast = useToast()

  return (
    <>
      <div className="page-head">
        <h1 className="page-head__title">Settings</h1>
        <p className="page-head__sub">
          The room target below is shared with everyone here. Everything else
          applies to your account across every room you're in.
        </p>
      </div>

      <RoomTargetForm
        pointTarget={pointTarget}
        onSave={async (v) => {
          if (await updatePointTarget(v)) toast.ok(`This room's daily target is now ${v} points.`)
        }}
      />

      <div style={{ marginTop: 'var(--space-5)' }}>
        <ProfileForm
          userId={session.user.id}
          profile={profile}
          onSaved={async () => {
            refreshProfile()
            await reload()
            toast.ok('Profile saved.')
          }}
        />
      </div>

      <div style={{ marginTop: 'var(--space-5)' }}>
        <PasswordForm onSaved={() => toast.ok('Password changed.')} />
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <Button variant="secondary" icon={<LogOut size={16} />} onClick={signOut}>
          Sign out
        </Button>
      </div>
    </>
  )
}

// The room's daily point target. Any member can change it — it is a shared
// setting for the room, the same way the habits themselves are all editable
// now, not something only the creator locks in once.
function RoomTargetForm({ pointTarget, onSave }) {
  const [value, setValue] = useState(pointTarget)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(Math.max(1, Math.round(Number(value) || pointTarget)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Daily point target" className="section--tight">
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        What every player in this room plays for each day. Changing it doesn't
        touch any habit's points — it only changes how much room is left before
        a new habit's points get fitted down.
      </p>
      <form onSubmit={submit} className="row" style={{ alignItems: 'flex-end' }}>
        <Field
          label="Points per day"
          id="room-target"
          type="number"
          min="1"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <Button type="submit" loading={saving} style={{ marginBottom: 'var(--space-4)' }}>
          Save
        </Button>
      </form>
    </Sheet>
  )
}

function ProfileForm({ userId, profile, onSaved }) {
  const [name, setName] = useState(profile.display_name)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [email, setEmail] = useState(profile.email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Your name cannot be empty.')
    setSaving(true)
    setError('')
    try {
      await updateProfile(userId, {
        display_name: name.trim(),
        avatar,
        email: email.trim() || null,
      })
      await onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Profile" className="section--tight">
      <form onSubmit={submit}>
        <fieldset>
          <legend>Your mark</legend>
          <div className="picker-grid picker-grid--marks" style={{ maxWidth: 400 }}>
            {AVATAR_TOKENS.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={t === avatar}
                aria-label={`Mark option ${AVATAR_TOKENS.indexOf(t) + 1}`}
                onClick={() => setAvatar(t)}
              >
                <Avatar name={name} seed={t} size="sm" />
              </button>
            ))}
          </div>
        </fieldset>

        <Field
          label="Your name"
          id="settings-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          required
          maxLength={40}
        />
        <Field
          label="Email"
          id="settings-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          hint="Used to recover your rooms if you lose access."
          error={error || undefined}
        />
        <Button type="submit" variant="primary" loading={saving} disabled={!name.trim()}>
          Save profile
        </Button>
      </form>
    </Sheet>
  )
}

function PasswordForm({ onSaved }) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (next.length < 6) return setError('Use at least 6 characters.')
    if (next !== confirm) return setError('The two passwords do not match.')
    setSaving(true)
    setError('')
    try {
      await changePassword(next)
      setNext('')
      setConfirm('')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Password" className="section--tight">
      <form onSubmit={submit}>
        <Field
          label="New password"
          id="settings-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          hint="At least 6 characters."
        />
        <Field
          label="Confirm new password"
          id="settings-password-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          error={error || undefined}
        />
        <Button type="submit" loading={saving} disabled={!next}>
          Change password
        </Button>
      </form>
    </Sheet>
  )
}
