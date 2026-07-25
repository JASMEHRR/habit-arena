// Fitting a habit's points into whatever is left of the room's daily target.
//
// The budget used to hard-reject an add that didn't fit. Now nothing is ever
// rejected: a habit that would blow the budget gets its points shrunk to
// whatever is left, floored at 1 so it is never worthless. The point target
// itself is a room setting (rooms.point_target), not a fixed constant.

// requested: the points the user asked for.
// used: points already committed by this player's other habits.
// target: the room's daily point target.
// Returns the points to actually save — requested, or clamped to fit.
export function fitPoints(requested, used, target) {
  const room = Math.max(0, target - used)
  const want = Math.max(1, Math.round(Number(requested) || 1))
  return room > 0 ? Math.min(want, room) : 1
}

// Fits a whole batch (e.g. an import) in one pass, so each habit's clamp
// accounts for the ones before it in the same batch rather than all competing
// for the same untouched `used` figure.
export function fitBatch(habits, used, target) {
  let running = used
  const fitted = []
  for (const h of habits) {
    const points = fitPoints(h.points, running, target)
    fitted.push({ ...h, points })
    running += points
  }
  return fitted
}
