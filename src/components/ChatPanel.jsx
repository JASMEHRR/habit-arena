import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { loadMessages, sendMessage, subscribeMessages } from '../lib/rooms.js'
import { Avatar, Button, EmptyState, Loading } from './ui/Primitives.jsx'
import { useToast } from './ui/Toast.jsx'

// Room chat.
//
// Three real defects fixed here, not just restyled:
//   - loading was indistinguishable from empty, because both rendered the same
//     "No messages yet" markup, so an in-flight fetch looked like a dead room;
//   - a failed send silently cleared your message and told you nothing;
//   - a failed load was swallowed entirely.
export default function ChatPanel({ room, players, me, previewCount }) {
  const toast = useToast()
  const [messages, setMessages] = useState(null) // null = still loading
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const byId = Object.fromEntries(players.map((p) => [p.id, p]))
  const preview = Boolean(previewCount)

  useEffect(() => {
    let alive = true
    loadMessages(room.id)
      .then((m) => alive && setMessages(m))
      .catch((e) => {
        if (!alive) return
        setMessages([])
        toast.error(e)
      })
    const unsub = subscribeMessages(room.id, (msg) => {
      setMessages((prev) =>
        prev && prev.some((x) => x.id === msg.id) ? prev : [...(prev || []), msg]
      )
    })
    return () => {
      alive = false
      unsub()
    }
  }, [room.id, toast])

  useEffect(() => {
    if (!preview && messages) bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages, preview])

  async function send(e) {
    e?.preventDefault()
    const body = text.trim()
    if (!body) return
    setSending(true)
    try {
      await sendMessage(room.id, me.id, body)
      // Only cleared once it actually landed, so a failure doesn't eat what you
      // typed.
      setText('')
    } catch (err) {
      toast.error(err)
    } finally {
      setSending(false)
    }
  }

  if (messages === null) return <Loading label="Loading messages" lines={4} />

  if (preview) {
    const recent = messages.filter((m) => !m.is_system).slice(-previewCount)
    if (recent.length === 0) return <p className="quiet small">No messages yet.</p>
    return (
      <ul className="stack" style={{ '--stack': 'var(--space-2)' }}>
        {recent.map((m) => (
          <li key={m.id} className="small">
            <strong>{byId[m.player_id]?.display_name || 'Someone'}</strong> {m.body}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      {messages.length === 0 ? (
        <EmptyState title="Nothing said yet">
          This is the room's group chat. Streaks and completed days get posted
          here automatically, and anything you type goes to everyone.
        </EmptyState>
      ) : (
        <div className="thread section--tight">
          {messages.map((m) => {
            if (m.is_system)
              return (
                <p key={m.id} className="msg--sys">
                  {m.body}
                </p>
              )
            const p = byId[m.player_id]
            const mine = m.player_id === me.id
            return (
              <article key={m.id} className={`msg ${mine ? 'msg--mine' : ''}`}>
                <Avatar name={p?.display_name} seed={p?.avatar} size="sm" />
                <div className="msg__body">
                  <p className="msg__meta">
                    {mine ? 'You' : p?.display_name || 'Someone'} · {time(m.created_at)}
                  </p>
                  <p className="msg__text">{m.body}</p>
                </div>
              </article>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <form className="composer section--tight" onSubmit={send}>
        <div className="field">
          <label className="sr-only" htmlFor="composer">
            Message the group
          </label>
          <div className="field__shell">
            <input
              id="composer"
              className="field__control"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message the group…"
              maxLength={500}
              autoComplete="off"
            />
          </div>
        </div>
        <Button
          type="submit"
          variant="primary"
          icon={<Send size={16} />}
          label="Send message"
          disabled={!text.trim() || sending}
        />
      </form>
    </>
  )
}

function time(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
