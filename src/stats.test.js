// Run with:  node src/stats.test.js
import assert from 'node:assert/strict'
import { levelFor } from './stats.js'

// level 1 spans 0..15, level 2 starts at 15, level 3 at 45, level 4 at 90.
assert.equal(levelFor(0).level, 1, '0 pts = level 1')
assert.equal(levelFor(0).pct, 0, 'level 1 starts empty')
assert.equal(levelFor(14).level, 1, 'just under threshold stays level 1')
assert.equal(levelFor(15).level, 2, '15 pts reaches level 2')
assert.equal(levelFor(15).into, 0, 'level 2 starts fresh')
assert.equal(levelFor(44).level, 2, 'still level 2 below 45')
assert.equal(levelFor(45).level, 3, '45 pts reaches level 3')
assert.equal(levelFor(90).level, 4, '90 pts reaches level 4')
assert.equal(levelFor(-5).level, 1, 'negative clamps to level 1')

const l2 = levelFor(30) // level 2 (15..45), into 15, span 30
assert.equal(l2.level, 2)
assert.equal(l2.into, 15)
assert.equal(l2.span, 30)
assert.equal(l2.pct, 50, 'halfway through level 2')

console.log('All stats tests passed ✅')
