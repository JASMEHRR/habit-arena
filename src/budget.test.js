import assert from 'node:assert/strict'
import { fitPoints, fitBatch } from './budget.js'

// Fits inside the remaining budget untouched.
assert.equal(fitPoints(5, 10, 30), 5)

// Would blow the budget -> clamped to what's left.
assert.equal(fitPoints(10, 25, 30), 5)

// Nothing left -> still added, floored at 1, never rejected.
assert.equal(fitPoints(5, 30, 30), 1)
assert.equal(fitPoints(5, 40, 30), 1)

// Never below 1 even for a 0-point request.
assert.equal(fitPoints(0, 0, 30), 1)

// Batch: each subsequent habit's clamp accounts for the ones before it.
{
  const out = fitBatch([{ points: 20 }, { points: 20 }, { points: 20 }], 0, 30)
  assert.deepEqual(out.map((h) => h.points), [20, 10, 1])
  assert.equal(out.reduce((s, h) => s + h.points, 0), 31) // last one still floors at 1
}

console.log('All budget tests passed ✅')
