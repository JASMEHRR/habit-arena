// Run with:  node src/bank.test.js
import assert from 'node:assert/strict'
import { habitDebt, bankTotal, bankPenalty, debtMeterPercent } from './bank.js'

// --- single-habit debt with repayment ---
assert.equal(habitDebt(8, [8, 8, 8]), 0, 'meeting target every day = no debt')
assert.equal(habitDebt(8, [6]), 2, 'slept 6/8 = 2h debt')
assert.equal(habitDebt(8, [6, 6]), 4, 'two short nights accumulate')
assert.equal(habitDebt(8, [6, 9]), 1, 'over-target repays: 6 (+2) then 9 (-1) = 1')
assert.equal(habitDebt(8, [6, 11]), 0, 'big surplus clears debt, no credit banked')
assert.equal(habitDebt(8, [10, 6]), 2, 'surplus with no prior debt is not banked; later shortfall stands')

// --- bank total across habits (only is_bank counts) ---
const habits = [
  { id: 'sleep', target: 8, is_bank: true },
  { id: 'water', target: 8, is_bank: true },
  { id: 'read', target: 1, is_bank: false }, // not a bank habit
]
const values = { sleep: [6, 6], water: [8, 5], read: [0, 0] }
assert.equal(bankTotal(habits, values), 4 + 3, 'sleep 4h + water 3 debt; read ignored')
assert.equal(bankTotal(habits, {}), 0, 'no logged values = no debt')

// --- weekly penalty ---
assert.equal(bankPenalty(7), 7, 'default 1 point per unit')
assert.equal(bankPenalty(4, 2), 8, 'custom per-unit')
assert.equal(bankPenalty(-3), 0, 'negative debt clamps to 0')

// --- meter percentage ---
assert.equal(debtMeterPercent(0), 0, 'no debt = empty meter')
assert.equal(debtMeterPercent(8, 16), 50, 'half of cap = 50%')
assert.equal(debtMeterPercent(40, 16), 100, 'over cap clamps to full')

console.log('All bank tests passed ✅')
