import { Flame, Trophy, CalendarDays } from 'lucide-react'
import AnimatedNumber from './AnimatedNumber.jsx'

// Always-visible stat bar: total points, weekly points, current streak.
export default function TopBar({ player, total, week, streak }) {
  return (
    <div className="topbar">
      <div className="me">
        <span className="me-avatar">{player.avatar}</span>
        <div>
          <div className="me-name">{player.display_name}</div>
          <div className="me-sub">Your dashboard</div>
        </div>
      </div>
      <div className="stat-pills">
        <div className="stat-pill">
          <Trophy size={16} className="i-amber" />
          <b><AnimatedNumber value={total} /></b>
          <span>total</span>
        </div>
        <div className="stat-pill">
          <CalendarDays size={16} className="i-green" />
          <b><AnimatedNumber value={week} /></b>
          <span>this week</span>
        </div>
        <div className={'stat-pill' + (streak > 0 ? ' hot' : '')}>
          <Flame size={16} className="i-flame" />
          <b><AnimatedNumber value={streak} /></b>
          <span>day streak</span>
        </div>
      </div>
    </div>
  )
}
