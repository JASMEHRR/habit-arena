import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Users, Copy, Check } from 'lucide-react'
import {
  loadRoomState, joinRoom, subscribeRoom, savedPlayerId, setEntryValue, removeHabit, sendMessage,
} from '../lib/rooms.js'
import { todayStr } from '../scoring.js'
import { totalScore, weekScore, streak, dayCompletion, playerBankDebt, levelFor, rankedIds } from '../stats.js'
import TopBar from '../components/TopBar.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import BankMeter from '../components/BankMeter.jsx'
import HabitCard from '../components/HabitCard.jsx'
import HabitSetup from '../components/HabitSetup.jsx'
import ImportHabits from '../components/ImportHabits.jsx'
import CopyHabits from '../components/CopyHabits.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import StatsPanel from '../components/StatsPanel.jsx'
import ChatPanel from '../components/ChatPanel.jsx'

const MOTIVATION = [
  'Small wins compound. Show up today.',
  'Discipline beats motivation. Tick one off.',
  'Your rival is training right now.',
  "Don't break the chain.",
  'Consistency is the real flex.',
]

const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐳', '🦩', '⚡', '🔥', '🌟', '🚀']

export default function Room() {
  const { code } = useParams()
  const [state, setState] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)

  const reload = useCallback(async () => {
    try {
      const s = await loadRoomState(code, todayStr())
      if (!s) return setStatus('notfound')
      setState(s)
      setStatus('ready')
    } catch (e) {
      setError(e.message || 'Failed to load room.')
      setStatus('error')
    }
  }, [code])

  useEffect(() => {
    reload()
    const unsub = subscribeRoom(reload)
    return unsub
  }, [reload])

  // Celebrate hitting 100%, streak milestones, and taking #1 (once each).
  const prevPctRef = useRef(null)
  const streakRef = useRef(null)
  const rankRef = useRef(null)
  useEffect(() => {
    if (!state) return
    const mid = savedPlayerId(state.room.id)
    const p = state.players.find((x) => x.id === mid)
    if (!p || p.habits.length === 0) return
    const comp = dayCompletion(p.habits, state.entriesByHabit, state.date)
    const sv = streak(p.habits, state.entriesByHabit, state.days)
    const rank = rankedIds(state.players, state.entriesByHabit, state.days).indexOf(p.id) + 1
    const first = prevPctRef.current === null

    if (!first && prevPctRef.current < 100 && comp.pct >= 100) {
      confetti({ particleCount: 120, spread: 72, origin: { y: 0.35 } })
      sendMessage(state.room.id, p.id, `${p.avatar} ${p.display_name} cleared their whole day! 🎯`, true).catch(() => {})
    }
    if (!first && sv > streakRef.current && sv % 7 === 0) {
      sendMessage(state.room.id, p.id, `🔥 ${p.display_name} hit a ${sv}-day streak!`, true).catch(() => {})
    }
    // Took over #1 from someone else.
    if (!first && rank === 1 && rankRef.current > 1 && state.players.length > 1) {
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.4 }, colors: ['#f59e0b', '#10b981', '#7c6cff'] })
      sendMessage(state.room.id, p.id, `👑 ${p.display_name} took the lead!`, true).catch(() => {})
    }
    prevPctRef.current = comp.pct
    streakRef.current = sv
    rankRef.current = rank
  }, [state])

  if (status === 'loading') return <Centered>Loading…</Centered>
  if (status === 'notfound') return <Centered>Room not found. Check the invite link.</Centered>
  if (status === 'error') return <Centered>{error}</Centered>

  const { room, players, entriesByHabit, days, date } = state
  const myId = savedPlayerId(room.id)
  const me = players.find((p) => p.id === myId) || null

  // ---- join screen ----
  if (!me) {
    async function join() {
      if (!name.trim()) return
      setJoining(true); setError('')
      try {
        await joinRoom(code, name.trim(), avatar)
        await reload()
      } catch (e) { setError(e.message); setJoining(false) }
    }
    return (
      <div className="wrap">
        <header><h1>🏆 Habit Arena</h1>
          <p className="sub">Join the competition — pick an avatar and a name.</p>
        </header>
        <div className="card center">
          <h2>Join the arena</h2>
          <div className="avatar-pick">
            {AVATARS.map((a) => (
              <button key={a} className={'ava' + (a === avatar ? ' on' : '')} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
          <div className="addrow">
            <input placeholder="Your name" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()} />
            <button onClick={join} disabled={joining}>{joining ? 'Joining…' : 'Join'}</button>
          </div>
          {error && <p className="errline">{error}</p>}
        </div>
      </div>
    )
  }

  const needsSetup = me.habits.length === 0
  const inviteUrl = `${window.location.origin}/room/${code}`
  function copyLink() {
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  // Optimistic update so ticks feel instant; realtime/reload confirms.
  async function onSetValue(habitId, value, target) {
    setState((s) => {
      const eb = { ...s.entriesByHabit, [habitId]: { ...(s.entriesByHabit[habitId] || {}) } }
      eb[habitId][s.date] = { value, done: value >= target }
      return { ...s, entriesByHabit: eb }
    })
    try {
      await setEntryValue(habitId, date, value, target)
    } catch (e) { setError(e.message); reload() }
  }
  async function onRemove(habitId) {
    try { await removeHabit(habitId); reload() } catch (e) { setError(e.message) }
  }

  const total = totalScore(me.habits, entriesByHabit, days)
  const week = weekScore(me.habits, entriesByHabit, days)
  const streakVal = streak(me.habits, entriesByHabit, days)
  const level = levelFor(total)
  const comp = dayCompletion(me.habits, entriesByHabit, date)
  const debt = playerBankDebt(me.habits, entriesByHabit, days)

  return (
    <div className="wrap wide dash">
      <TopBar player={me} total={total} week={week} streak={streakVal} level={level} />
      <p className="motivation">“{MOTIVATION[new Date(date).getDate() % MOTIVATION.length]}”</p>

      <div className="invite">
        <span className="roster">
          <Users size={16} />
          {players.map((p) => <span key={p.id} className="roster-ava" title={p.display_name}>{p.avatar}</span>)}
          <span className="muted small">{players.length} in room</span>
        </span>
        <button className="copy-link" onClick={copyLink}>
          {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Invite friends</>}
        </button>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          <div className="today-row">
            <div className="card ring-card">
              <ProgressRing pct={comp.pct} label={`${Math.round(comp.pct)}%`} sub="today" />
              <div className="ring-side">
                <h2>Today</h2>
                <p className="muted">{comp.earned} / {comp.max} points earned</p>
              </div>
            </div>
            <div className="card"><BankMeter debt={debt} unit="" /></div>
          </div>

          {needsSetup ? (
            <>
              <CopyHabits currentRoomId={room.id} player={me} onChanged={reload} />
              <div className="card"><ImportHabits player={me} onChanged={reload} /></div>
              <HabitSetup player={me} onChanged={reload} />
            </>
          ) : (
            <>
              <div className="hcards">
                {me.habits.map((h) => (
                  <HabitCard key={h.id} habit={h} entriesByHabit={entriesByHabit}
                    days={days} today={date} onSetValue={onSetValue} onRemove={onRemove} />
                ))}
              </div>
              <details className="more"><summary>Add habits (form, import, or copy from another room)</summary>
                <CopyHabits currentRoomId={room.id} player={me} onChanged={reload} />
                <div className="card"><ImportHabits player={me} onChanged={reload} /></div>
                <HabitSetup player={me} onChanged={reload} />
              </details>
              <StatsPanel habits={me.habits} entriesByHabit={entriesByHabit} days={days} />
            </>
          )}
        </div>

        <aside className="dash-side">
          <Leaderboard players={players} entriesByHabit={entriesByHabit} days={days} meId={me.id} />
        </aside>
      </div>

      <ChatPanel room={room} players={players} me={me} />
      <footer>Room {code} · everyone updates live</footer>
    </div>
  )
}

function Centered({ children }) {
  return <div className="wrap"><div className="card center">{children}</div></div>
}
