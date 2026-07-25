// The plane portrait: a player's day as a figure assembled from flat planes.
//
// Two jobs, and the second is what lets this direction carry a daily-use task
// surface rather than only looking good:
//
//   1. Read-only (`mini`, `readOnly`): the figure summarises a day at a glance.
//      Used in the leaderboard as a series of figures, and in stats as a
//      30-day contact sheet.
//   2. Interactive: every plane is a real <button>. The figure IS the control
//      surface, and the labelled roster beneath it (HabitRoster) is a second
//      route to the same planes — so "which habit did I miss" is always
//      readable in words, never only as an abstract composition.
import { assignPlanes, FRAME } from '../planes'

// What tapping this plane will actually do. "Read — the eye" said what the plane
// was but never what pressing it meant, and for a bad habit the two possible
// meanings are opposites.
function hitLabel(habit, slot, on) {
  const where = `${habit.label} — ${slot.part}`
  if (habit.kind === 'bad') return on ? `${where}. Marked avoided; clears it` : `${where}. Mark avoided`
  const target = habit.target || 1
  if (target > 1) return on ? `${where}. Done; clears it` : `${where}. Mark all ${target} done`
  return on ? `${where}. Done; clears it` : `${where}. Mark done`
}

function Shape({ shape, ...rest }) {
  return shape.type === 'rect' ? (
    <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...rest} />
  ) : (
    <path d={shape.d} {...rest} />
  )
}

/**
 * @param habits    the player's habits
 * @param isOn      (habit) => boolean — is this habit's plane landed today
 * @param onToggle  (habit) => void — omit for a read-only figure
 * @param label     accessible description of the whole figure
 * @param avoid     the ground colour this figure sits on, so no plane is painted
 *                  in it and rendered invisible
 */
export function PlanePortrait({ habits = [], isOn, onToggle, label, mini, avoid, className = '' }) {
  const { assigned } = assignPlanes(habits, { avoid })
  const readOnly = !onToggle

  return (
    <div className={['portrait', mini && 'mini', className].filter(Boolean).join(' ')}>
      {/* role="img" is a leaf in the accessibility tree: everything inside it is
          pruned. On the interactive figure that hid twelve real buttons — the
          app's primary action — from assistive tech entirely, while still
          leaving twelve tab stops behind. Interactive figures are a labelled
          group; only the read-only ones are images. The spoken summary moves to
          its own element so it is still announced either way. */}
      {!readOnly && (
        <p className="sr-only" role="status">
          {label}
        </p>
      )}
      <svg
        className="portrait__svg"
        viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
        role={readOnly ? 'img' : 'group'}
        aria-label={readOnly ? label : 'Your habits, as planes of a portrait'}
        // Planes are cut shapes; nothing here should be antialiased into a
        // gradient at the seams.
        shapeRendering="crispEdges"
      >
        {assigned.map(({ habit, slot, fill }) => {
          const on = isOn ? Boolean(isOn(habit)) : true
          const common = {
            shape: slot.shape,
            fill,
            className: 'plane',
            'data-wipe': slot.wipe,
            'data-on': String(on),
          }
          if (readOnly) return <Shape key={slot.id} {...common} />
          return (
            <g key={slot.id}>
              <Shape {...common} />
              {/* The hit target sits over the plane, and is its own geometry
                  rather than the painted shape: the eye and the brow are only
                  9–11 units tall, which is under 30px on a phone. It stays in
                  the DOM when the plane is off — that is the point, you tap the
                  empty paper where the plane belongs. */}
              <rect
                x={slot.hit.x}
                y={slot.hit.y}
                width={slot.hit.w}
                height={slot.hit.h}
                fill="transparent"
                className="plane-hit"
                tabIndex={0}
                role="button"
                aria-pressed={on}
                aria-label={hitLabel(habit, slot, on)}
                onClick={() => onToggle(habit)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggle(habit)
                  }
                }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// The figure at thumbnail scale: no hit targets, no labels of its own.
export function MiniPortrait({ habits, isOn, label, large, avoid }) {
  const { assigned } = assignPlanes(habits, { avoid })
  return (
    <svg
      className={large ? 'mini mini--lg' : 'mini'}
      viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      {assigned.map(({ habit, slot, fill }) =>
        (isOn ? isOn(habit) : true) ? <Shape key={slot.id} shape={slot.shape} fill={fill} /> : null
      )}
    </svg>
  )
}
