// The one dropdown in the app.
//
// The group switcher it replaces had no aria-expanded, no aria-haspopup, no
// Escape, no outside-click close, no focus return, and it mixed <button> items
// with a <Link> in the same list. All of that is handled once, here.
import { useEffect, useRef, useState, useId } from 'react'

export function Menu({ label, trigger, align = 'left', children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()

  // Close on outside pointerdown and on Escape; Escape returns focus to the
  // trigger so a keyboard user is never dropped at the top of the document.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Move focus into the panel when it opens by keyboard.
  useEffect(() => {
    if (open) panelRef.current?.querySelector('.menu__item')?.focus()
  }, [open])

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="btn btn--ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={typeof trigger === 'string' ? undefined : label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="menu"
          aria-label={label}
          className={`menu__panel ${align === 'right' ? 'menu__panel--right' : ''}`}
          // Any activation inside closes the menu, so callers never have to
          // remember to. Keyboard Enter/Space fires click too.
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// A menu row. Renders as whatever it needs to be — button by default, or the
// `as` element (react-router <Link>) — but always carries role="menuitem".
export function MenuItem({ as: Tag = 'button', danger, current, children, ...rest }) {
  return (
    <Tag
      role="menuitem"
      aria-current={current ? 'true' : undefined}
      className={['menu__item', danger && 'menu__item--danger'].filter(Boolean).join(' ')}
      {...(Tag === 'button' ? { type: 'button' } : {})}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function MenuSeparator() {
  return <div className="menu__sep" role="separator" />
}
