// The component atoms, in the poster language. Kept in one file because they
// are small, always imported together, and a barrel per primitive would be nine
// files of ceremony.
import { useId } from 'react'
import { parseAvatarToken } from '../../avatars'

/* ---- Button ----
   One control for every action in the app. An icon-only button REQUIRES a
   label: six icon-only buttons shipped with no accessible name before this
   redesign (remove habit, delete entry, send message, pick icon, leave room,
   delete room) and `title` is not a name a touch user ever sees. Making the
   prop mandatory is what stops that recurring. */
export function Button({
  variant = 'secondary',
  size,
  block,
  loading,
  icon,
  label,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  const iconOnly = icon && !children
  if (iconOnly && !label) {
    throw new Error('Button: an icon-only button needs a `label` for its accessible name')
  }
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'lg' && 'btn--lg',
    block && 'btn--block',
    iconOnly && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      {...rest}
    >
      {icon}
      {loading && !iconOnly ? 'Working…' : children}
    </button>
  )
}

/* ---- Field ----
   Wraps a real <label for>. Sixteen text inputs in this app were
   placeholder-only with no label and no aria-label; a placeholder disappears the
   moment you type, so a half-filled form became unreadable and screen readers
   announced nothing. Everything routes through here now. */
export function Field({
  label,
  hint,
  error,
  as = 'input',
  id,
  children,
  className = '',
  inline,
  ...rest
}) {
  const autoId = useId()
  const fieldId = id || autoId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const Tag = as

  const control = children || (
    <Tag
      id={fieldId}
      className="field__control"
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  )

  return (
    <div
      className={['field', inline && 'field--inline', error && 'field--invalid', className]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label className="field__label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div className="field__shell">{control}</div>
      {hint && !error && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

/* A surface. `edge` paints the 4px plane band on its leading side. */
export function Sheet({ raised, flush, quiet, edge, title, action, children, className = '', ...rest }) {
  const classes = [
    'sheet',
    raised && 'sheet--raised',
    flush && 'sheet--flush',
    quiet && 'sheet--quiet',
    edge && 'sheet--edge',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={classes} style={edge ? { '--edge': edge } : undefined} {...rest}>
      {(title || action) && (
        <header className="sheet__head">
          {title && <h2 className="sheet__title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, foot, size }) {
  return (
    <div className={['stat', size === 'lg' && 'stat--lg'].filter(Boolean).join(' ')}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {foot && <span className="stat__foot">{foot}</span>}
    </div>
  )
}

export function Badge({ tone, children }) {
  return <span className={['badge', tone && `badge--${tone}`].filter(Boolean).join(' ')}>{children}</span>
}

/* ---- Skeleton ----
   There was no loading affordance of any kind in this app: chat rendered
   identical markup while loading and when genuinely empty, and the landing page
   hid its rooms section entirely mid-fetch and then shifted the layout. */
export function Skeleton({ w = '100%', h, lines, className = '' }) {
  if (lines) {
    return (
      <div aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="skeleton skeleton--text"
            style={{ width: i === lines - 1 ? '62%' : '100%' }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className={`skeleton ${className}`} style={{ width: w, height: h || '1em' }} aria-hidden="true" />
  )
}

/* A loading region that announces itself instead of looking like an empty one. */
export function Loading({ label = 'Loading', lines = 3 }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <Skeleton lines={lines} />
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <span className="empty__mark" aria-hidden="true" />
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__body">{children}</p>}
      {action}
    </div>
  )
}

/* ---- Avatar ----
   Replaces the 14 emoji. An emoji renders differently on every OS, sits on the
   text baseline at inherited size with no alignment control, and carries no
   relationship to the palette. A player is now a plane: one of four colours in
   one of four silhouettes, with their initial. That is 16 combinations, drawn
   deterministically from the stored avatar value so nobody's identity changes,
   and it needs no font support at all. */
const AV_PLANES = ['var(--plane-indigo)', 'var(--plane-vermilion)', 'var(--plane-gold)', 'var(--plane-black)']

function hashCode(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0
  return Math.abs(h)
}

// An explicit `pNsM` token wins; anything else (every emoji already stored in
// the database) hashes to a stable look, so no existing player's mark changes.
export function avatarLook(seed) {
  const token = parseAvatarToken(seed)
  const { plane, shape } = token || (() => {
    const h = hashCode(seed || '?')
    return { plane: h % AV_PLANES.length, shape: Math.floor(h / 4) % 4 }
  })()
  return { bg: AV_PLANES[plane], shape, gold: plane === 2 }
}

export function Avatar({ name, seed, size, className = '' }) {
  const initial = String(name || '?').trim().charAt(0) || '?'
  const { bg, shape, gold } = avatarLook(seed || name)
  return (
    <span
      className={[
        'avatar',
        `avatar--s${shape}`,
        gold && 'avatar--gold',
        size && `avatar--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--av-bg': bg }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
