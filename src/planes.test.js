// Checks the plane assignment: the mapping from habits to portrait slots.
// Plain Node, no framework, same shape as the other test files here.
import assert from 'node:assert/strict'
import {
  PLANE_SLOTS, PLANE_COLORS, assignPlanes, planeColorVar, wipeAxis, FRAME,
} from './planes.js'

const h = (id, points, color) => ({ id, points, color, label: 'h' + id })

// Highest-point habits take the structural slots, in slot order.
{
  const { assigned, overflow } = assignPlanes([h('a', 2), h('b', 5), h('c', 3)])
  assert.deepEqual(assigned.map((p) => p.habit.id), ['b', 'c', 'a'])
  assert.deepEqual(assigned.map((p) => p.slot.id), ['profile', 'shoulder', 'crown'])
  assert.equal(overflow.length, 0)
}

// Ties break on id, so every viewer of a room sees the same composition.
{
  const one = assignPlanes([h('z', 5), h('a', 5)])
  const two = assignPlanes([h('a', 5), h('z', 5)])
  assert.deepEqual(
    one.assigned.map((p) => p.habit.id),
    two.assigned.map((p) => p.habit.id)
  )
  assert.deepEqual(one.assigned.map((p) => p.habit.id), ['a', 'z'])
}

// Past the last slot habits overflow rather than being dropped.
{
  const many = Array.from({ length: PLANE_SLOTS.length + 3 }, (_, i) =>
    h(String(i).padStart(2, '0'), 1)
  )
  const { assigned, overflow } = assignPlanes(many)
  assert.equal(assigned.length, PLANE_SLOTS.length)
  assert.equal(overflow.length, 3)
  // Nothing is lost between the two lists.
  assert.equal(assigned.length + overflow.length, many.length)
}

assert.deepEqual(assignPlanes([]), { assigned: [], overflow: [] })

// An on-palette habit colour is honoured; anything else (the pre-redesign
// sky/cyan/violet mandatory habits) falls back to the slot default.
{
  const slot = PLANE_SLOTS.find((s) => s.id === 'profile') // default black
  assert.equal(planeColorVar('#e43d24', slot), 'var(--plane-vermilion)')
  assert.equal(planeColorVar('#E43D24', slot), 'var(--plane-vermilion)', 'case-insensitive')
  assert.equal(planeColorVar('#38bdf8', slot), 'var(--plane-black)', 'legacy sky -> slot default')
  assert.equal(planeColorVar(null, slot), 'var(--plane-black)')
  assert.equal(planeColorVar(undefined, slot), 'var(--plane-black)')
}

// Every slot default is one of the four world colours, so no slot can
// introduce a fifth hue.
for (const slot of PLANE_SLOTS) {
  assert.ok(PLANE_COLORS.includes(slot.color), slot.id + ' uses an off-palette default')
  assert.ok(slot.part && slot.id, slot.id + ' needs an id and a spoken part name')
  assert.ok(['rect', 'path'].includes(slot.shape.type), slot.id + ' has an unknown shape type')
}

// A plane is never painted in the colour of the ground it sits on, whatever the
// player picked — otherwise the plane is simply invisible.
{
  const ground = '#1e3a8a' // the indigo poster field
  const habits = PLANE_SLOTS.map((s, i) => h(String(i).padStart(2, '0'), 5, ground))
  const { assigned } = assignPlanes(habits, { avoid: ground })
  for (const p of assigned) {
    assert.notEqual(p.fill, 'var(--plane-indigo)', p.slot.id + ' vanished into the ground')
    assert.ok(Object.values({
      v: 'var(--plane-vermilion)', g: 'var(--plane-gold)', b: 'var(--plane-black)',
    }).includes(p.fill), p.slot.id + ' left the palette')
  }
  // Deterministic: the same input gives every viewer the same figure.
  assert.deepEqual(
    assignPlanes(habits, { avoid: ground }).assigned.map((p) => p.fill),
    assigned.map((p) => p.fill)
  )
  // A slot whose own default is the ground colour also gets shifted.
  const backSlot = PLANE_SLOTS.find((s) => s.id === 'back') // default indigo
  assert.notEqual(planeColorVar(null, backSlot, ground), 'var(--plane-indigo)')
  // Without `avoid` nothing is shifted.
  assert.equal(planeColorVar(ground, backSlot), 'var(--plane-indigo)')
}

// Slot ids are unique, or two habits would fight over one plane.
assert.equal(new Set(PLANE_SLOTS.map((s) => s.id)).size, PLANE_SLOTS.length)

// Rect slots stay inside the frame.
for (const slot of PLANE_SLOTS.filter((s) => s.shape.type === 'rect')) {
  const { x, y, w, h: hh } = slot.shape
  assert.ok(x >= 0 && y >= 0 && x + w <= FRAME.w && y + hh <= FRAME.h, slot.id + ' leaves the frame')
}

// Planes wipe outward from the centre of the frame, not all in one direction.
{
  assert.equal(wipeAxis(PLANE_SLOTS.find((s) => s.id === 'profile')), 'right', 'face edge draws first')
  assert.equal(wipeAxis(PLANE_SLOTS.find((s) => s.id === 'shoulder')), 'up', 'the body rises')
  assert.equal(wipeAxis(PLANE_SLOTS.find((s) => s.id === 'eye')), 'down', 'the eye stamps in')
  const axes = new Set(PLANE_SLOTS.map(wipeAxis))
  assert.equal(axes.size, 4, 'the figure should assemble from all four directions')
  for (const slot of PLANE_SLOTS) {
    assert.ok(['up', 'down', 'left', 'right'].includes(slot.wipe), slot.id + ' has no wipe direction')
  }
}

console.log('planes.test.js: ok')
