import { useRoom } from './RoomProvider.jsx'
import Leaderboard from '../../components/Leaderboard.jsx'

export default function LeaderboardView() {
  const { state, me, pointTarget } = useRoom()
  const { players, entriesByHabit, days, date } = state

  return (
    <>
      <div className="page-head">
        <p className="caption">This week</p>
        <h1 className="page-head__title">The board</h1>
        <p className="page-head__sub">
          Ranked on points earned this week. Everyone here plays for the same{' '}
          {pointTarget} points a day, so this is a straight comparison. Tap a
          player to see how their day is going, habit by habit.
        </p>
      </div>
      <Leaderboard
        players={players}
        entriesByHabit={entriesByHabit}
        days={days}
        today={date}
        meId={me.id}
      />
    </>
  )
}
