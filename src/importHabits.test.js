// Run with:  node src/importHabits.test.js
import assert from 'node:assert/strict'
import { parseHabitsImport } from './lib/importHabits.js'

// --- happy path with a ```json fence and surrounding prose ---
const pasted = `Sure! Here you go:
\`\`\`json
{ "habits": [
  { "label": "Sleep", "kind": "good", "points": 4, "target": 8, "unit": "hours" },
  { "label": "Exercise", "kind": "good", "points": 5 },
  { "label": "No junk food", "kind": "bad", "bad_mode": "penalty_do", "points": 4 }
] }
\`\`\`
Hope that helps!`
const { habits, errors } = parseHabitsImport(pasted)
assert.equal(errors.length, 0, 'no errors on clean input')
assert.equal(habits.length, 3, 'parsed all three')
assert.equal(habits[0].is_bank, true, 'unit hours -> bank')
assert.equal(habits[0].icon, 'moon', 'sleep -> moon icon auto-assigned')
assert.equal(habits[1].icon, 'dumbbell', 'exercise -> dumbbell')
assert.equal(habits[2].kind, 'bad', 'bad habit kind')
assert.equal(habits[2].bad_mode, 'penalty_do', 'bad mode preserved')
assert.ok(habits[0].color !== habits[1].color, 'colors cycle distinctly')

// --- bare array, no fence ---
const bare = parseHabitsImport('[{"label":"Read","kind":"good","points":3}]')
assert.equal(bare.habits.length, 1, 'bare array works')
assert.equal(bare.habits[0].target, 1, 'default target 1')

// --- invalid/missing fields normalize or skip ---
const messy = parseHabitsImport('{"habits":[{"kind":"good"},{"label":"Meditate","kind":"weird","points":"nan"}]}')
assert.equal(messy.habits.length, 1, 'label-less habit skipped')
assert.equal(messy.habits[0].kind, 'good', 'invalid kind -> good')
assert.equal(messy.habits[0].points, 3, 'invalid points -> default 3')
assert.ok(messy.errors.length >= 1, 'reported the skipped habit')

// --- garbage input ---
assert.equal(parseHabitsImport('no json here').habits.length, 0, 'garbage -> no habits')
assert.ok(parseHabitsImport('no json here').errors.length, 'garbage -> error message')

console.log('All import tests passed ✅')
