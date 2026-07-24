import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, PieChart, Pie,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { weeklySeries, completionRate, heatmap, habitCallouts } from '../stats.js'

// Weekly bar chart + completion donut + streak heatmap + best/missed callouts.
export default function StatsPanel({ habits, entriesByHabit, days }) {
  const series = weeklySeries(habits, entriesByHabit, days)
  const rate = completionRate(habits, entriesByHabit, days)
  const heat = heatmap(habits, entriesByHabit, days)
  const { best, missed } = habitCallouts(habits, entriesByHabit, days)

  const donut = [
    { name: 'done', value: rate },
    { name: 'rest', value: 100 - rate },
  ]

  return (
    <div className="card stats">
      <h2>Your stats</h2>

      <div className="stats-charts">
        <div className="chart-box">
          <span className="chart-label">Points this week</span>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={series} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#9aa0c2', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#161a2e', border: '1px solid #2b3050', borderRadius: 10, color: '#eef0fb' }} />
              <Bar dataKey="points" radius={[6, 6, 0, 0]}>
                {series.map((d, i) => (
                  <Cell key={i} fill={d.points < 0 ? '#ff5c78' : 'url(#barGrad)'} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box donut-box">
          <span className="chart-label">Completion</span>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={58}
                  startAngle={90} endAngle={-270} stroke="none">
                  <Cell fill="#10b981" />
                  <Cell fill="rgba(255,255,255,0.08)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><b>{rate}%</b><span>avg</span></div>
          </div>
        </div>
      </div>

      <span className="chart-label">Last 30 days</span>
      <div className="heat">
        {heat.map((h) => (
          <span key={h.date} className="heat-cell" title={`${h.date}: ${Math.round(h.pct)}%`}
            style={{ background: heatColor(h.pct) }} />
        ))}
      </div>

      <div className="callouts">
        {best && best.done > 0 && (
          <div className="callout up"><TrendingUp size={15} /> Best: <b>{best.habit.label}</b> ({best.done}/{best.total})</div>
        )}
        {missed && missed.total - missed.done > 0 && (
          <div className="callout down"><TrendingDown size={15} /> Most missed: <b>{missed.habit.label}</b></div>
        )}
      </div>
    </div>
  )
}

function heatColor(pct) {
  if (pct <= 0) return 'rgba(255,255,255,0.06)'
  const a = 0.25 + (pct / 100) * 0.75
  return `rgba(16, 185, 129, ${a})`
}
