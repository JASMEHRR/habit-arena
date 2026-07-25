import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, LogOut, Trash2, Plus } from 'lucide-react'
import { createRoom, listMyRooms, leaveRoom, deleteRoom, claimOldRooms } from '../lib/rooms.js'
import { signOut } from '../lib/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar, Button, EmptyState, Field, Sheet, Skeleton } from '../components/ui/Primitives.jsx'
import { useToast } from '../components/ui/Toast.jsx'

// Your rooms.
export default function Landing() {
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const toast = useToast()
  const [rooms, setRooms] = useState(null) // null = loading
  const [busy, setBusy] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)

  useEffect(() => {
    let alive = true
    listMyRooms(session.user.id)
      .then((r) => alive && setRooms(r))
      .catch((e) => {
        if (!alive) return
        setRooms([])
        toast.error(e)
      })
    return () => {
      alive = false
    }
  }, [session.user.id, toast])

  async function start() {
    setBusy(true)
    try {
      const code = await createRoom(session.user.id, profile)
      navigate(`/room/${code}`)
    } catch (e) {
      toast.error(e)
      setBusy(false)
    }
  }

  return (
    <main className="main main--narrow">
      <header className="row row--between" style={{ marginBottom: 'var(--space-6)' }}>
        <span className="wordmark">
          <span className="wordmark__mark" aria-hidden="true" />
          <span className="wordmark__text">Habit Arena</span>
        </span>
        <Button variant="ghost" icon={<LogOut size={16} />} onClick={signOut}>
          Sign out
        </Button>
      </header>

      <div className="page-head">
        <p className="caption">
          {profile?.display_name ? `Signed in as ${profile.display_name}` : 'Signed in'}
        </p>
        <h1 className="page-head__title">Your rooms</h1>
        <p className="page-head__sub">
          A room is one group competing on their own habits. Everyone in it plays
          for the same daily point target, set by the room.
        </p>
      </div>

      <Sheet edge="var(--accent)">
        <h2 className="sheet__title">Start a room</h2>
        <p className="quiet small" style={{ margin: 'var(--space-2) 0 var(--space-4)' }}>
          Creates a room and an invite link to share with your friends.
        </p>
        <Button variant="primary" icon={<Plus size={16} />} loading={busy} onClick={start}>
          Start a room
        </Button>
      </Sheet>

      <div style={{ marginTop: 'var(--space-6)' }}>
        {/* The rooms section used to be gated on !loadingRooms, so during the
            fetch it was simply absent and then popped in and shifted the page.
            It now holds its space with a skeleton. */}
        {rooms === null ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Loading your rooms…</span>
            <div className="rooms">
              {[0, 1].map((i) => (
                <div key={i} className="room-row">
                  <Skeleton w="32px" h="32px" />
                  <Skeleton w="40%" h="1em" />
                </div>
              ))}
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState title="No rooms yet">
            Start one above, or open an invite link a friend sent you to join
            theirs.
          </EmptyState>
        ) : (
          <ul className="rooms">
            {rooms.map((r) => (
              <li key={r.roomId} className="room-row">
                <Link className="room-row__link" to={`/room/${r.code}`}>
                  <Avatar name={r.name || 'Room'} seed={r.code} />
                  <span style={{ minWidth: 0 }}>
                    <span className="room-row__name" style={{ display: 'block' }}>
                      {r.name ? `${r.name}'s room` : 'Room'}
                    </span>
                    <span className="room-row__code">{r.code}</span>
                  </span>
                  <ArrowRight size={16} className="push" aria-hidden="true" />
                </Link>
                <Button
                  variant="ghost"
                  icon={<LogOut size={15} />}
                  label={`Leave ${r.name ? `${r.name}'s room` : 'room ' + r.code}`}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Leave ${r.name ? `${r.name}'s room` : 'this room'}? Your habits and history in it will be deleted.`
                      )
                    )
                      return
                    if (await toast.report(() => leaveRoom(r.playerId)))
                      setRooms((rs) => rs.filter((x) => x.roomId !== r.roomId))
                  }}
                />
                {r.isCreator && (
                  <Button
                    variant="danger"
                    icon={<Trash2 size={15} />}
                    label={`Delete ${r.name ? `${r.name}'s room` : 'room ' + r.code} for everyone`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete ${r.name ? `${r.name}'s room` : 'this room'} for everyone? This cannot be undone.`
                        )
                      )
                        return
                      if (await toast.report(() => deleteRoom(r.roomId)))
                        setRooms((rs) => rs.filter((x) => x.roomId !== r.roomId))
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recovery is a rare, one-off need, so it stays out of the way until
          asked for rather than occupying a permanent card. */}
      <div style={{ marginTop: 'var(--space-7)' }}>
        {claimOpen ? (
          <ClaimRooms
            onDone={() =>
              listMyRooms(session.user.id)
                .then(setRooms)
                .catch((e) => toast.error(e))
            }
          />
        ) : (
          <button type="button" className="textlink" onClick={() => setClaimOpen(true)}>
            Had a room before accounts existed?
          </button>
        )}
      </div>

      <footer className="foot">Group habit competition · live scores</footer>
    </main>
  )
}

function ClaimRooms({ onDone }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function claim(e) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      const n = await claimOldRooms(email)
      if (n > 0) {
        toast.ok(`Recovered ${n} room${n > 1 ? 's' : ''}.`)
        setEmail('')
        await onDone()
      } else {
        toast.push('No rooms found with that email attached.', 'ok')
      }
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Recover an old room">
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        If a room from before accounts existed had your email attached, enter it
        to re-link that room to this account.
      </p>
      <form onSubmit={claim} className="row" style={{ alignItems: 'flex-end' }}>
        <Field
          label="Email on the old room"
          id="claim-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={{ flex: 1 }}
        />
        <Button type="submit" loading={busy} style={{ marginBottom: 'var(--space-4)' }}>
          Recover
        </Button>
      </form>
    </Sheet>
  )
}
