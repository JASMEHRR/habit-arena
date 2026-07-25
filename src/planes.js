// Habit Arena — the plane portrait.
//
// The direction: a player's day is a portrait assembled from flat planes, one
// plane per habit. Mark a habit and its plane lands; skip it and the plane is
// absent and the paper shows through, so the person does not resolve. Tanaka's
// own principle — remove any single plane and the figure collapses — is the
// accountability mechanic.
//
// Everything here is geometry and mapping. No React, no DOM, so it is testable
// as plain data (see planes.test.js).

// The frame. A 3:4 portrait field; every slot below is expressed in these
// units so the composition scales to any rendered size without rounding drift.
export const FRAME = { w: 120, h: 160 }

// The four plane colours of the world. Any habit colour that is not one of
// these (the three mandatory habits were seeded sky/cyan/violet before this
// redesign) falls back to its slot's default, so legacy rows stay on-palette
// without a database migration.
export const PLANE_COLORS = ['#e43d24', '#1e3a8a', '#c8a24b', '#111111']

const COLOR_VAR = {
  '#e43d24': 'var(--plane-vermilion)',
  '#1e3a8a': 'var(--plane-indigo)',
  '#c8a24b': 'var(--plane-gold)',
  '#111111': 'var(--plane-black)',
}

// Slots, in assignment order. Order is deliberate: habits are assigned by
// descending point value, and the first slots are the big structural masses —
// so the habits worth most carry the most of the figure, and the three
// mandatory five-pointers always build the head, body and back.
//
// `shape` is a primitive only. Tanaka's posters are rectangles, circles, half
// circles and triangles with hard edges and no outlines; nothing here is
// allowed to be a rounded-corner card.
//
// `hit` is the touch target, kept separate from the paint. Reusing the painted
// shape as the tap area put the signature planes below the 44px minimum on a
// phone — the eye is 26x11 units, which is 29px tall at the mobile size — and
// the eye is exactly the plane the direction leans on. Every hit box is at
// least 18 units on both axes, which is 45px at the phone's portrait cap.
// Detail slots come later in this array than the masses they sit on, so their
// hit boxes are drawn on top and win the tap.
export const PLANE_SLOTS = [
  {
    id: 'profile',
    part: 'the profile',
    hit: { x: 34, y: 20, w: 64, h: 100 },
    wipe: 'right',
    color: '#111111',
    // The recognition key, and the reason the whole figure reads. Its left edge
    // is a face seen from the side: forehead, brow, nose, lip, chin. Every
    // other plane shares an edge with this one, so the composition is a
    // partition of a head rather than a scatter of shapes. It goes to the
    // highest-point habit, so the figure's spine is also the day's biggest win.
    shape: {
      type: 'path',
      d: 'M98 20 L54 20 L47 40 L44 60 L34 70 L27 79 L39 83 L36 91 L44 97 L42 110 L53 120 L98 120 Z',
    },
  },
  {
    id: 'shoulder',
    part: 'the shoulder',
    hit: { x: 60, y: 120, w: 60, h: 40 },
    wipe: 'up',
    color: '#e43d24',
    // Quarter disc anchored to the bottom-right corner, meeting the neck line.
    shape: { type: 'path', d: 'M120 78 A82 82 0 0 0 38 160 L120 160 Z' },
  },
  {
    id: 'crown',
    part: 'the crown',
    hit: { x: 42, y: 0, w: 68, h: 22 },
    wipe: 'down',
    color: '#c8a24b',
    // Caps the head: a half disc sitting on the profile's flat top edge.
    shape: { type: 'path', d: 'M42 20 A34 20 0 0 1 110 20 Z' },
  },
  {
    id: 'back',
    part: 'the back of the head',
    hit: { x: 98, y: 20, w: 22, h: 100 },
    wipe: 'right',
    color: '#1e3a8a',
    shape: { type: 'rect', x: 98, y: 20, w: 22, h: 100 },
  },
  {
    id: 'torso',
    part: 'the base',
    hit: { x: 0, y: 128, w: 44, h: 32 },
    wipe: 'up',
    color: '#1e3a8a',
    shape: { type: 'rect', x: 0, y: 128, w: 44, h: 32 },
  },
  {
    id: 'eye',
    part: 'the eye',
    hit: { x: 53, y: 46, w: 26, h: 24 },
    wipe: 'down',
    color: '#e43d24',
    // Lower half-disc, sitting on the profile mass. The signature mark of the
    // whole world, and it lands late so it always draws over the face.
    shape: { type: 'path', d: 'M55 56 A11 11 0 0 0 77 56 Z' },
  },
  {
    id: 'collar',
    part: 'the collar',
    hit: { x: 53, y: 116, w: 45, h: 20 },
    wipe: 'right',
    color: '#c8a24b',
    shape: { type: 'rect', x: 53, y: 120, w: 45, h: 11 },
  },
  {
    id: 'brow',
    part: 'the brow',
    hit: { x: 50, y: 28, w: 44, h: 20 },
    wipe: 'right',
    color: '#1e3a8a',
    shape: { type: 'rect', x: 50, y: 34, w: 44, h: 9 },
  },
  // Satellites. Small marks in the margins of the composition, for rooms where
  // someone runs a lot of small habits. Still part of the figure, still on the
  // grid, deliberately quiet.
  {
    id: 'mark-a',
    part: 'a margin mark',
    hit: { x: 0, y: 0, w: 22, h: 22 },
    wipe: 'up',
    color: '#e43d24',
    shape: { type: 'rect', x: 0, y: 0, w: 22, h: 22 },
  },
  {
    id: 'mark-b',
    part: 'a margin mark',
    hit: { x: 0, y: 28, w: 22, h: 22 },
    wipe: 'left',
    color: '#1e3a8a',
    shape: { type: 'rect', x: 0, y: 28, w: 22, h: 22 },
  },
  {
    id: 'mark-c',
    part: 'a margin mark',
    hit: { x: 98, y: 134, w: 22, h: 22 },
    wipe: 'down',
    color: '#c8a24b',
    shape: { type: 'rect', x: 98, y: 134, w: 22, h: 22 },
  },
  {
    id: 'mark-d',
    part: 'a margin mark',
    hit: { x: 0, y: 54, w: 20, h: 20 },
    wipe: 'left',
    color: '#111111',
    shape: { type: 'rect', x: 0, y: 56, w: 18, h: 18 },
  },
]

// Resolve a habit's stored colour to a CSS custom property. Off-palette
// (pre-redesign) colours fall back to the slot default so the composition never
// leaves the four planes.
//
// `avoid` is the colour of the ground the figure will sit on. A plane painted in
// the ground's own colour is an invisible plane, and since players choose their
// own colours we cannot rely on them not picking the one behind them — so it is
// shifted to the next colour that is neither the ground nor a duplicate. The
// shift is deterministic, so a figure looks the same to everyone who sees it.
export function planeColorVar(habitColor, slot, avoid) {
  const hex = String(habitColor || '').toLowerCase()
  let color = COLOR_VAR[hex] ? hex : slot.color
  if (avoid && color === avoid) {
    const alternatives = PLANE_COLORS.filter((c) => c !== avoid)
    // Offset by the slot's position so two shifted planes don't collapse onto
    // the same replacement colour.
    const i = PLANE_SLOTS.findIndex((s) => s.id === slot.id)
    color = alternatives[(i < 0 ? 0 : i) % alternatives.length]
  }
  return COLOR_VAR[color]
}

// Zip habits onto slots. Sorted by points descending so the most valuable
// habits carry the largest planes; ties break on id so the assignment is
// stable across reloads and identical for every viewer of the same room.
//
// Habits past the last slot are returned as `overflow`. They are never hidden —
// the roster below the figure lists every habit — the figure just stops at
// twelve planes rather than degrading into confetti.
export function assignPlanes(habits = [], { avoid } = {}) {
  const ordered = [...habits].sort(
    (a, b) => (b.points || 0) - (a.points || 0) || String(a.id).localeCompare(String(b.id))
  )
  const assigned = ordered.slice(0, PLANE_SLOTS.length).map((habit, i) => ({
    habit,
    slot: PLANE_SLOTS[i],
    fill: planeColorVar(habit.color, PLANE_SLOTS[i], avoid),
  }))
  return { assigned, overflow: ordered.slice(PLANE_SLOTS.length) }
}

// Which direction a plane's revealing edge travels when it lands. A hard-edged
// plane has no business fading in, so it is wiped instead.
//
// Declared per slot rather than derived: the direction is art direction, and
// deriving it from a bounding box gave every curved plane the same answer. The
// profile wipes rightward so its face edge draws first; the body rises; the eye
// drops in like a stamp.
export function wipeAxis(slot) {
  return slot.wipe
}
