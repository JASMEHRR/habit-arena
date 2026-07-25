import { useRoom } from './RoomProvider.jsx'
import StatsPanel from '../../components/StatsPanel.jsx'
import PointsLedger from '../../components/PointsLedger.jsx'

export default function StatsView() {
  const { state, me, deleteEntry } = useRoom()
  const { entriesByHabit, days } = state

  return (
    <>
      <div className="page-head">
        <p className="caption">Last {days.length} days</p>
        <h1 className="page-head__title">Your record</h1>
      </div>
      <StatsPanel habits={me.habits} entriesByHabit={entriesByHabit} days={days} />
      <div style={{ marginTop: 'var(--space-6)' }}>
        <PointsLedger
          habits={me.habits}
          entriesByHabit={entriesByHabit}
          days={days}
          onDelete={deleteEntry}
        />
      </div>
    </>
  )
}
