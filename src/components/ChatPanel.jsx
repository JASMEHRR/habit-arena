import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { loadMessages, sendMessage, subscribeMessages } from '../lib/rooms.js'

// Room-scoped group chat. Side drawer on desktop, full-width sheet on mobile.
export default function ChatPanel({ room, players, me }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [unread, setUnread] = useState(0)
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
    if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  }, [messages, open])

  // Count unread while the panel is closed.
  useEffect(() => {
    if (!open && messages.length) setUnread((u) => u + 0) // handled below on new msg
  }, [open])
  const lastLen = useRef(0)
  useEffect(() => {
    if (!open && messages.length > lastLen.current) setUnread(messages.length - lastLen.current)
    if (open) lastLen.current = messages.length
  }, [messages, open])

  async function send() {
    const body = text.trim()
    if (!body) return
    setText('')
    try { await sendMessage(room.id, me.id, body) } catch { /* ignore */ }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(true)}>
        <MessageCircle size={22} />
        {unread > 0 && <span className="chat-badge">{unread}</span>}
      </button>

      <div className={'chat-drawer' + (open ? ' open' : '')}>
        <div className="chat-head">
          <h2>Room chat</h2>
          <button className="x" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

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
    </>
  )
}

function time(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
