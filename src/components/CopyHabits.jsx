import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { listMyRooms, copyHabitsFrom } from '../lib/rooms.js'
import { useAuth } from '../context/AuthContext.jsx'

// Reuse your habits from another room you're already in.
export default function CopyHabits({ currentRoomId, player, onChanged }) {
  const { session } = useAuth()
  const [others, setOthers] = useState([])
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    listMyRooms(session.user.id).then((rooms) => {
      if (!alive) return
      const rest = rooms.filter((r) => r.roomId !== currentRoomId)
      setOthers(rest)
      setFrom(rest[0]?.code || '')
    })
    return () => { alive = false }
  }, [session.user.id, currentRoomId])

  if (others.length === 0) return null

  async function copy() {
    if (!from) return
    setBusy(true); setMsg('')
    try {
      const n = await copyHabitsFrom(from, session.user.id, player.id)
      setMsg(n ? `Copied ${n} habit${n > 1 ? 's' : ''}. (Mandatory habits and anything over your custom budget are skipped.)` : 'Nothing to copy — no custom habits there that fit your remaining budget.')
      onChanged()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card import">
      <div className="import-head"><Copy size={16} className="i-green" /><b>Reuse habits from another room</b></div>
      <p className="muted small">Bring the same habits into this group so you compete on the same goals.</p>
      <div className="addrow">
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          {others.map((r) => (
            <option key={r.roomId} value={r.code}>{r.name ? `${r.name}'s room` : 'Room'} · {r.code}</option>
          ))}
        </select>
        <button onClick={copy} disabled={busy}>{busy ? 'Copying…' : 'Copy habits'}</button>
      </div>
      {msg && <p className="muted small stack-sm">{msg}</p>}
    </div>
  )
}
