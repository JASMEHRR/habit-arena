import { useEffect, useState } from 'react'
import { listMyRooms, copyHabitsFrom } from '../lib/rooms.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Field, Sheet } from './ui/Primitives.jsx'
import { useToast } from './ui/Toast.jsx'

// Reuse your habits from another room you are already in.
//
// It still hides itself when you have no other rooms, which is right — but it is
// now placed inside the first-run flow, where it is actually relevant, instead of
// being a permanently-invisible panel most people never discovered. Success and
// failure no longer render into the same neutral grey paragraph.
export default function CopyHabits({ currentRoomId, player, pointTarget, onChanged }) {
  const { session } = useAuth()
  const toast = useToast()
  const [others, setOthers] = useState(null)
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    listMyRooms(session.user.id)
      .then((rooms) => {
        if (!alive) return
        const rest = rooms.filter((r) => r.roomId !== currentRoomId)
        setOthers(rest)
        setFrom(rest[0]?.code || '')
      })
      .catch((e) => {
        if (!alive) return
        setOthers([])
        toast.error(e)
      })
    return () => {
      alive = false
    }
  }, [session.user.id, currentRoomId, toast])

  // Still loading, or genuinely nothing to offer.
  if (others === null || others.length === 0) return null

  async function copy() {
    if (!from) return
    setBusy(true)
    try {
      const n = await copyHabitsFrom(from, session.user.id, player.id, pointTarget)
      if (n) {
        toast.ok(
          `Copied ${n} habit${n > 1 ? 's' : ''}. The shared starter habits weren't — you already have your own, and points were fitted to this room's target.`
        )
      } else {
        toast.push("That room has no habits of your own to copy — only its shared starters.", 'ok')
      }
      await onChanged()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Or reuse habits from another room" className="section--tight" style={{ marginTop: 'var(--space-5)' }}>
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        Bring the same habits into this room so you and this group compete on the
        same goals.
      </p>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Field label="Copy from" id="copy-from" className="push" style={{ flex: 1 }}>
          <select
            id="copy-from"
            className="field__control"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {others.map((r) => (
              <option key={r.roomId} value={r.code}>
                {r.name ? `${r.name}'s room` : 'Room'} · {r.code}
              </option>
            ))}
          </select>
        </Field>
        <Button onClick={copy} loading={busy} style={{ marginBottom: 'var(--space-4)' }}>
          Copy habits
        </Button>
      </div>
    </Sheet>
  )
}
