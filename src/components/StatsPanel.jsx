import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { weeklySeries, completionRate, heatmap, habitCallouts, dayCompletion } from '../stats.js'
import { MiniPortrait } from './PlanePortrait.jsx'
import { planeOn } from './HabitRoster.jsx'
import { EmptyState, Sheet, Stat } from './ui/Primitives.jsx'

// Stats.
//
// Two structural changes:
//   - one chart system. The dashboard used to hand-roll the same two charts in
//     CSS (div heights and a conic-gradient) while this panel drew them in
//     recharts, so the same numbers had two different looks.
//   - the 30-day heatmap becomes a contact sheet of figures. Thirty unlabelled
//     colour cells whose only affordance was a `title` tooltip told a phone user
//     nothing at all; thirty small portraits show the same month and are legible
//     without hovering.
export default function StatsPanel({ habits, entriesByHabit, days }) {
  const series = weeklySeries(habits, entriesByHabit, days)
  const rate = completionRate(habits, entriesByHabit, days)
  const heat = heatmap(habits, entriesByHabit, days)
  const { best, missed } = habitCallouts(habits, entriesByHabit, days)

  // A player with no habits used to get a zero-height bar chart, a 0% donut, a
  // grey heatmap and no callouts: a card of empty chrome.
  if (habits.length === 0) {
    return (
      <EmptyState title="No stats yet">
        Add a habit or two and this fills in: points per day, how much of each
        day you complete, and the last thirty days as a run of portraits.
      </EmptyState>
    )
  }

  const logged = days.some((d) => dayCompletion(habits, entriesByHabit, d).earned !== 0)

  return (
    <>
      <div className="row" style={{ gap: 'var(--space-7)', marginBottom: 'var(--space-6)' }}>
        <Stat label="Completion" value={`${rate}%`} foot={`over ${days.length} days`} size="lg" />
        {best && best.done > 0 && (
          <Stat label="Most kept" value={best.habit.label} foot={`${best.done} of ${best.total} days`} />
        )}
      </div>

      <Sheet title="Points per day" className="section--tight" style={{ marginBottom: 'var(--space-5)' }}>
        {!logged ? (
          <p className="quiet small">Nothing logged in this window yet.</p>
        ) : (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              {/* Flat fills, a hairline baseline, no rounded bars, no gradient,
                  no shadowed tooltip card — the world elsewhere bans exactly
                  these ("no outlines... nothing here is allowed to be a
                  rounded-corner card"), and this was the one place still built
                  like a stock chart library rather than this poster. */}
              <BarChart data={series} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--rule-strong)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: 'var(--plane-gold-wash)' }}
                  contentStyle={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--rule-strong)',
                    borderRadius: 0,
                    boxShadow: 'none',
                    color: 'var(--ink)',
                  }}
                />
                <Bar dataKey="points" radius={0}>
                  {series.map((d, i) => (
                    <Cell key={i} fill={d.points < 0 ? 'var(--negative)' : 'var(--plane-indigo)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Sheet>

      <Sheet title="The last 30 days" className="section--tight">
        <p className="quiet small" style={{ marginBottom: 'var(--space-4)' }}>
          One portrait per day. A complete figure is a complete day.
        </p>
        <ol className="contact-sheet">
          {heat.map((h) => (
            <li key={h.date}>
              <DayFigure
                date={h.date}
                pct={h.pct}
                habits={habits}
                entriesByHabit={entriesByHabit}
              />
            </li>
          ))}
        </ol>
      </Sheet>

      {missed && missed.total - missed.done > 0 && (
        <div className="callouts" style={{ marginTop: 'var(--space-5)' }}>
          <p className="callout" style={{ '--edge': 'var(--negative)' }}>
            <TrendingDown size={15} aria-hidden="true" />
            <span>
              Most missed: <strong>{missed.habit.label}</strong>, {missed.total - missed.done} of{' '}
              {missed.total} days
            </span>
          </p>
          {best && best.done > 0 && (
            <p className="callout" style={{ '--edge': 'var(--plane-indigo)' }}>
              <TrendingUp size={15} aria-hidden="true" />
              <span>
                Most kept: <strong>{best.habit.label}</strong>, {best.done} of {best.total} days
              </span>
            </p>
          )}
        </div>
      )}
    </>
  )
}

function DayFigure({ date, pct, habits, entriesByHabit }) {
  const label = `${new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })}: ${Math.round(pct)} per cent complete`
  return (
    <span className="contact-sheet__cell" title={label}>
      <MiniPortrait
        habits={habits}
        isOn={(h) => planeOn(h, entriesByHabit, date)}
        label={label}
      />
    </span>
  )
}
