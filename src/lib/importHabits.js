// Parse a habit list pasted from an LLM (e.g. Claude) into normalized habit
// objects ready for addHabit(). Tolerant of extra prose and ```json fences.
import { iconKeyFor, ICONS, HABIT_COLORS } from '../icons.js'

// The prompt a user pastes into Claude. Kept here so the app can offer a
// "copy prompt" button that always matches the parser's expected format.
export const IMPORT_PROMPT = `You are helping me set up my habits in an app called Habit Arena.
First, interview me with a few short questions (a few at a time, then wait for
my answers) about my daily routine and goals: wake/sleep times, exercise, meals,
water, screen time, study/reading, and any bad habits I want to cut.

When you have enough, output ONLY a single JSON code block (no other text),
exactly in this format:

\`\`\`json
{
  "habits": [
    { "label": "Sleep", "kind": "good", "points": 4, "target": 8, "unit": "hours" },
    { "label": "Drink water", "kind": "good", "points": 2, "target": 8, "unit": "glasses" },
    { "label": "Exercise", "kind": "good", "points": 5 },
    { "label": "Read", "kind": "good", "points": 3 },
    { "label": "No doomscrolling", "kind": "bad", "bad_mode": "reward_avoid", "points": 3 }
  ]
}
\`\`\`

Rules:
- "kind" is "good" or "bad".
- Good habits: "points" 1-5 (harder = higher). Optional "target" (a daily number
  such as reps) and "unit" ("hours" or "glasses" for sleep/water, otherwise omit).
- Bad habits: "bad_mode" is "reward_avoid" (points for avoiding it),
  "penalty_do" (lose points if you do it), or "both". "points" 1-5.
- 5-10 habits total, based on my real routine. Output the JSON block only, last.`

const KINDS = ['good', 'bad']
const MODES = ['reward_avoid', 'penalty_do', 'both']
const UNITS = ['', 'hours', 'glasses']

// Pull the first JSON object/array out of arbitrary pasted text.
function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : text
  const start = body.search(/[[{]/)
  if (start === -1) return null
  const open = body[start]
  const close = open === '{' ? '}' : ']'
  const end = body.lastIndexOf(close)
  if (end <= start) return null
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    return null
  }
}

function clampPoints(p, fallback) {
  const n = Math.round(Number(p))
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(20, n))
}

// Returns { habits: [...normalized], errors: [...strings] }.
export function parseHabitsImport(text) {
  const errors = []
  const data = extractJson(text || '')
  if (!data) return { habits: [], errors: ['Could not find valid JSON. Paste the whole ```json block from Claude.'] }

  const list = Array.isArray(data) ? data : data.habits
  if (!Array.isArray(list)) return { habits: [], errors: ['JSON has no "habits" array.'] }

  const habits = []
  list.forEach((raw, i) => {
    const label = typeof raw?.label === 'string' ? raw.label.trim() : ''
    if (!label) { errors.push(`Habit #${i + 1} has no label — skipped.`); return }

    const kind = KINDS.includes(raw.kind) ? raw.kind : 'good'
    const unit = UNITS.includes(raw.unit) ? raw.unit : ''
    const is_bank = raw.is_bank === true || unit === 'hours' || unit === 'glasses'
    const bad_mode = kind === 'bad' ? (MODES.includes(raw.bad_mode) ? raw.bad_mode : 'reward_avoid') : null
    const icon = raw.icon && ICONS[raw.icon] ? raw.icon : iconKeyFor(label)
    const target = kind === 'good' ? Math.max(1, Math.round(Number(raw.target) || 1)) : 1

    habits.push({
      label, kind, bad_mode,
      points: clampPoints(raw.points, kind === 'bad' ? 4 : 3),
      target, unit, is_bank, icon,
      color: HABIT_COLORS[habits.length % HABIT_COLORS.length],
    })
  })

  if (!habits.length && !errors.length) errors.push('No valid habits found.')
  return { habits, errors }
}
