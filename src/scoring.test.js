// Run with:  node src/scoring.test.js   (or: npm test)
import assert from 'node:assert/strict'
import { habitPoints, dailyMax, playerScore, progressPercent } from './scoring.js'

const good = { id: 'g', label: 'Exercise', kind: 'good', points: 5 }
const avoid = { id: 'a', label: 'No junk food', kind: 'bad', points: 4, bad_mode: 'reward_avoid' }
const penalty = { id: 'p', label: 'Doomscroll', kind: 'bad', points: 3, bad_mode: 'penalty_do' }
const both = { id: 'b', label: 'Smoke', kind: 'bad', points: 6, bad_mode: 'both' }

// --- good habit ---
assert.equal(habitPoints(good, true), 5, 'good done = +points')
assert.equal(habitPoints(good, false), 0, 'good not done = 0')

// --- bad: reward_avoid ---
assert.equal(habitPoints(avoid, false), 4, 'avoided bad = +points')
assert.equal(habitPoints(avoid, true), 0, 'did bad (reward_avoid) = 0')

// --- bad: penalty_do ---
assert.equal(habitPoints(penalty, true), -3, 'did bad (penalty_do) = -points')
assert.equal(habitPoints(penalty, false), 0, 'avoided bad (penalty_do) = 0')

// --- bad: both ---
assert.equal(habitPoints(both, false), 6, 'avoided bad (both) = +points')
assert.equal(habitPoints(both, true), -6, 'did bad (both) = -points')

// --- dailyMax: good + reward_avoid + both count; penalty_do does not ---
assert.equal(dailyMax([good, avoid, penalty, both]), 5 + 4 + 6, 'dailyMax sums positive-capable habits')
assert.equal(dailyMax([penalty]), 0, 'penalty_do only -> max 0')

// --- playerScore across a mixed day ---
const habits = [good, avoid, penalty, both]
// did exercise, ate junk, doomscrolled, avoided smoking
const done = { g: true, a: true, p: true, b: false }
assert.equal(playerScore(habits, done), 5 + 0 + -3 + 6, 'playerScore sums per-habit points')
assert.equal(playerScore(habits, {}), 0 + 4 + 0 + 6, 'nothing marked = avoided bads earn')

// --- progressPercent clamping ---
assert.equal(progressPercent(0, 10), 0, '0/10 = 0%')
assert.equal(progressPercent(5, 10), 50, '5/10 = 50%')
assert.equal(progressPercent(-3, 10), 0, 'negative clamps to 0')
assert.equal(progressPercent(20, 10), 100, 'over clamps to 100')
assert.equal(progressPercent(5, 0), 0, 'zero max = 0% (no divide by zero)')

console.log('All scoring tests passed ✅')
