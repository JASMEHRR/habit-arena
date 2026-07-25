import { useState } from 'react'
import { ClipboardCopy, Check, Wand2 } from 'lucide-react'
import { addHabit } from '../lib/rooms.js'
import { parseHabitsImport, IMPORT_PROMPT } from '../lib/importHabits.js'
import { iconComponent } from '../icons.js'
import { fitBatch } from '../budget.js'
import { Button, Field, Sheet } from './ui/Primitives.jsx'
import { useToast } from './ui/Toast.jsx'

// Set up a batch of habits from a JSON list.
//
// Rebuilt rather than restyled. What was wrong before:
//   - the textarea had no label, only a placeholder — and the placeholder
//     contained a literal `&apos;` because the HTML entity was written inside a
//     JS string, so it rendered as "Claude&apos;s JSON";
//   - only the first parse error was ever shown, the rest were silently dropped;
//   - the add loop had no catch, so a failure partway through left some habits
//     created, some not, and told the user nothing at all;
//   - it read as internal tooling: three numbered steps telling you to go and
//     use a different product before you could use this one.
//
// It is now framed for what it is — an optional shortcut for people who already
// have a list — states plainly what is copied, reports every error, and stops at
// the first failure with an honest account of what did get added.
export default function ImportHabits({ player, pointTarget, onChanged }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const { habits, errors } = text.trim() ? parseHabitsImport(text) : { habits: [], errors: [] }

  const used = player.habits.reduce((s, h) => s + h.points, 0)
  const remaining = Math.max(0, pointTarget - used)
  const importTotal = habits.reduce((s, h) => s + (h.points || 0), 0)
  // What each habit will actually be saved at — every one is added, but points
  // may shrink to fit the room's target. Shown so the preview is honest.
  const fitted = fitBatch(habits, used, pointTarget)
  const anyShrunk = fitted.some((h, i) => h.points !== habits[i]?.points)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Couldn't reach the clipboard. Select the prompt manually instead.")
    }
  }

  async function addAll() {
    if (!habits.length) return
    setBusy(true)
    let added = 0
    try {
      for (const h of fitted) {
        await addHabit(player.id, h)
        added++
      }
      setText('')
      toast.ok(
        anyShrunk
          ? `Added ${added} habit${added === 1 ? '' : 's'}, some with fewer points than requested to fit the room's ${pointTarget}-point target.`
          : `Added ${added} habit${added === 1 ? '' : 's'}.`
      )
    } catch (e) {
      // The old loop swallowed this, leaving a half-finished import invisible.
      toast.push(
        added === 0
          ? `Nothing was added: ${e.message}`
          : `Added ${added} of ${habits.length}, then failed: ${e.message}. The rest are still in the box.`,
        'error'
      )
    } finally {
      setBusy(false)
      await onChanged()
    }
  }

  return (
    <Sheet title="Have a list already?" className="section--tight">
      <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
        If you keep your habits somewhere else, or want an assistant to draft them
        from your routine, paste a JSON list here and they are all created at once.
        Copy the prompt below to get a list in the right shape.
      </p>

      <button type="button" className="chip" onClick={copyPrompt}>
        {copied ? <Check size={14} aria-hidden="true" /> : <ClipboardCopy size={14} aria-hidden="true" />}
        {copied ? 'Prompt copied' : 'Copy the prompt'}
      </button>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Field
          label="Habit list (JSON)"
          id="import-json"
          as="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder='{ "habits": [ { "label": "Read", "kind": "good", "points": 3 } ] }'
          hint={`${remaining} of ${pointTarget} room points unspent. Anything over that shrinks to fit.`}
        />
      </div>

      {/* Every parse problem, not just the first. */}
      {errors.length > 0 && (
        <ul style={{ marginBottom: 'var(--space-4)' }}>
          {errors.map((msg, i) => (
            <li key={i} className="field__error">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {habits.length > 0 && (
        <>
          <p className="caption caption--ink">
            {habits.length} habit{habits.length === 1 ? '' : 's'} ·{' '}
            {anyShrunk ? `${importTotal} requested, ${fitted.reduce((s, h) => s + h.points, 0)} will fit` : `${importTotal} points`}
          </p>
          {/* Shows what will actually be saved, not what was typed — every habit
              is added regardless, so the honest preview is the fitted one. */}
          <ul className="row row--tight" style={{ margin: 'var(--space-2) 0 var(--space-4)' }}>
            {fitted.map((h, i) => {
              const Icon = iconComponent(h.icon)
              const shrunk = h.points !== habits[i]?.points
              return (
                <li key={i} className="chip">
                  <span
                    className="hrow__swatch"
                    style={{ '--hswatch': h.color }}
                    aria-hidden="true"
                  />
                  <Icon size={13} aria-hidden="true" /> {h.label}
                  <span className="caption">
                    {h.kind === 'bad' ? '−' : '+'}
                    {h.points}
                    {shrunk ? ` (of ${habits[i].points})` : ''}
                  </span>
                </li>
              )
            })}
          </ul>
          <Button variant="primary" icon={<Wand2 size={15} />} loading={busy} onClick={addAll}>
            Add {habits.length} habit{habits.length === 1 ? '' : 's'}
          </Button>
        </>
      )}
    </Sheet>
  )
}
