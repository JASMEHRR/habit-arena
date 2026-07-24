import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { loadMessages, sendMessage, subscribeMessages } from '../lib/rooms.js'

// Room-scoped group chat.
// mode="inline" renders the full scrollable thread + composer (Room chat view).
// mode="preview" renders the last few lines only, read-only (dashboard overview card).
export default function ChatPanel({ room, players, me, mode = 'inline', previewCount = 3 }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))

  useEffect(() => {
    let alive = true
    loadMessages(room.id).then((m) => alive && setMessages(m)).catch(() => {})
    const unsub = subscribeMessages(room.id, (msg) => {
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]))
    })
    return () => { alive = false; unsub() }
  }, [room.id])

  useEffect(() => {
    if (mode === 'inline') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mode])

  async function send() {
    const body = text.trim()
    if (!body) return
    setText('')
    try { await sendMessage(room.id, me.id, body) } catch { /* ignore */ }
  }

  if (mode === 'preview') {
    const recent = messages.filter((m) => !m.is_system).slice(-previewCount)
    return (
      <div className="card">
        <h3>Room chat</h3>
        <div className="chat-preview-lines">
          {recent.length === 0 && <p className="muted">No messages yet.</p>}
          {recent.map((m) => {
            const p = byId[m.player_id]
            return <div key={m.id}>{p?.avatar || '🙂'} <b>{p?.display_name || 'Someone'}:</b> {m.body}</div>
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Room chat</h3>
      <div className="chat-body">
        {messages.length === 0 && <p className="muted small">No messages yet. Say hi 👋</p>}
        {messages.map((m) => {
          if (m.is_system) return <div key={m.id} className="chat-sys">{m.body}</div>
          const p = byId[m.player_id]
          const mine = m.player_id === me.id
          return (
            <div key={m.id} className={'chat-msg' + (mine ? ' mine' : '')}>
              <span className="chat-ava">{p?.avatar || '🙂'}</span>
              <div className="chat-bubble">
                <span className="chat-meta">{p?.display_name || 'Someone'} · {time(m.created_at)}</span>
                <span className="chat-text">{m.body}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
        <input placeholder="Message the group…" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button onClick={send}><Send size={16} /></button>
      </div>
    </div>
  )
}

function time(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
