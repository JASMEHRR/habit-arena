import { useState } from 'react'
import { Copy } from 'lucide-react'
import { savedRooms, copyHabitsFrom } from '../lib/rooms.js'

// Reuse your habits from another room you're already in.
export default function CopyHabits({ currentRoomId, player, onChanged }) {
  const others = savedRooms().filter((r) => r.roomId !== currentRoomId)
  const [from, setFrom] = useState(others[0]?.code || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (others.length === 0) return null

  async function copy() {
    if (!from) return
    setBusy(true); setMsg('')
    try {
      const n = await copyHabitsFrom(from, player.id)
      setMsg(n ? `Copied ${n} habit${n > 1 ? 's' : ''}.` : 'That room has no habits yet.')
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
          {others.slice().reverse().map((r) => (
            <option key={r.roomId} value={r.code}>{r.name ? `${r.name}'s room` : 'Room'} · {r.code}</option>
          ))}
        </select>
        <button onClick={copy} disabled={busy}>{busy ? 'Copying…' : 'Copy habits'}</button>
      </div>
      {msg && <p className="muted small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  )
}
