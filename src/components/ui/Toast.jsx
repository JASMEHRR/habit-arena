// Toasts exist because of a specific failure in the app this replaces: every
// error from ticking a habit, removing one, deleting an entry, leaving a room
// and deleting a room was funnelled into one <p> at the *bottom* of the
// dashboard. A failed tick at the top of a long habit list reported itself
// offscreen. Several other failures were swallowed entirely — a failed chat send
// just cleared your message.
//
// So: one live region, anchored near the thumb on a phone, and a `report`
// helper that never lets a rejected promise disappear silently.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, tone = 'error') => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, tone }])
      // Errors stay until dismissed; confirmations clear themselves.
      if (tone !== 'error') setTimeout(() => dismiss(id), 3200)
      return id
    },
    [dismiss]
  )

  const api = useMemo(() => {
    const error = (e) => push(messageFor(e), 'error')
    return {
      push,
      dismiss,
      error,
      ok: (m) => push(m, 'ok'),
      // Wrap any async action: it runs, and if it throws the user is told.
      // Returns true on success so callers can branch without try/catch.
      report: async (fn) => {
        try {
          await fn()
          return true
        } catch (e) {
          error(e)
          return false
        }
      },
    }
  }, [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live so a failure is announced, not just drawn. */}
      <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <p className="toast__body">{t.message}</p>
            <button
              type="button"
              className="btn btn--icon toast__close"
              aria-label="Dismiss"
              title="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function messageFor(e) {
  if (!e) return 'Something went wrong.'
  if (typeof e === 'string') return e
  const raw = e.message || String(e)
  // Supabase/network failures surface as "Failed to fetch", which tells a user
  // nothing actionable.
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return raw
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
