import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from './RoomProvider.jsx'
import { joinRoom, createRoom, pointTargetFor } from '../../lib/rooms.js'
import { MiniPortrait } from '../../components/PlanePortrait.jsx'
import { planeOn } from '../../components/HabitRoster.jsx'
import { Avatar, Button } from '../../components/ui/Primitives.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

// The invited-but-not-yet-a-member screen.
//
// The old one advertised three statistics — member count, average streak,
// today's completion — which read "0 days avg. streak / 0% today's completion"
// for a brand new room. That is the worst possible first impression, and two of
// the three were meaningless to someone who had not joined. This shows the room's
// actual players and their actual figures instead: real, and never demoralising,
// because an empty room simply shows an empty room.

// The indigo field the poster half is printed on. Passed to each figure so no
// plane is painted in the ground's own colour and lost. Mirrors --plane-indigo.
const POSTER_GROUND = '#1e3a8a'

export default function JoinRoom() {
  const { code, state, profile, userId, reload } = useRoom()
  const navigate = useNavigate()
  const toast = useToast()
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)

  const { players, entriesByHabit, date } = state
  const withHabits = players.filter((p) => p.habits.length > 0)

  async function join() {
    setJoining(true)
    try {
      await joinRoom(code, userId, profile)
      await reload()
    } catch (e) {
      toast.error(e)
      setJoining(false)
    }
  }

  return (
    <div className="gate">
      <div className="gate__poster">
        <span className="wordmark" style={{ position: 'relative' }}>
          <span className="wordmark__mark" aria-hidden="true" />
          <span className="wordmark__text">Habit Arena</span>
        </span>
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <h1 className="gate__hero">
            {players.length === 0
              ? 'An empty room, waiting for its first figure.'
              : `${players.length} ${players.length === 1 ? 'person is' : 'people are'} building their day here.`}
          </h1>
          <p className="gate__lede">
            Everyone here plays for the same {pointTargetFor(state.room)} points a
            day. Each habit you keep lands one plane of your portrait.
          </p>

          {withHabits.length > 0 && (
            <ul className="row" style={{ marginTop: 'var(--space-5)', gap: 'var(--space-4)' }}>
              {withHabits.slice(0, 5).map((p) => (
                <li key={p.id} style={{ textAlign: 'center' }}>
                  <MiniPortrait
                    habits={p.habits}
                    isOn={(h) => planeOn(h, entriesByHabit, date)}
                    label={`${p.display_name}'s day so far`}
                    avoid={POSTER_GROUND}
                    large
                  />
                  <span className="caption" style={{ display: 'block', marginTop: 4, color: '#c9c1b2' }}>
                    {p.display_name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="gate__panel">
        <div className="gate__panel-inner">
          <p className="caption">Room {code}</p>
          <h2 style={{ fontSize: 'var(--fs-xl)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            Join this room
          </h2>

          <div className="row" style={{ marginBottom: 'var(--space-5)' }}>
            <Avatar name={profile.display_name} seed={profile.avatar} size="lg" />
            <span>
              <span style={{ fontWeight: 'var(--wt-semi)', display: 'block' }}>
                {profile.display_name}
              </span>
              <span className="quiet small">You will join with this profile.</span>
            </span>
          </div>

          <Button variant="primary" size="lg" block loading={joining} onClick={join}>
            Join room {code}
          </Button>

          <div className="divider">or</div>

          <Button
            size="lg"
            block
            loading={creating}
            onClick={async () => {
              setCreating(true)
              try {
                const newCode = await createRoom(userId, profile)
                navigate(`/room/${newCode}`)
              } catch (e) {
                toast.error(e)
                setCreating(false)
              }
            }}
          >
            Start your own room
          </Button>
        </div>
      </div>
    </div>
  )
}
