import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Users, Copy, Check, ChevronDown, Plus } from 'lucide-react'
import {
  loadRoomState, joinRoom, subscribeRoom, savedPlayerId, setEntryValue, removeHabit, sendMessage,
  savedRooms, createRoom, leaveRoom, updatePlayer,
} from '../lib/rooms.js'
import { todayStr } from '../scoring.js'
import {
  totalScore, weekScore, streak, dayCompletion, dayDone, playerBankDebt, levelFor, rankedIds, completionRate,
} from '../stats.js'
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

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'habits', icon: '✅', label: 'My habits' },
  { id: 'leaderboard', icon: '🏅', label: 'Leaderboard' },
  { id: 'chat', icon: '💬', label: 'Room chat' },
  { id: 'stats', icon: '📈', label: 'Stats' },
]

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [email, setEmail] = useState('')
  const [joining, setJoining] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [view, setView] = useState('dashboard')

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
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.4 }, colors: ['#E50914', '#ff3b3b', '#8b0000'] })
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

  // ---- join / login screen ----
  if (!me) {
    async function join() {
      if (!name.trim()) return
      setJoining(true); setError('')
      try {
        await joinRoom(code, name.trim(), avatar, email)
        await reload()
      } catch (e) { setError(e.message); setJoining(false) }
    }
    async function startNew() {
      setStartingNew(true); setError('')
      try {
        const newCode = await createRoom()
        navigate(`/room/${newCode}`)
      } catch (e) { setError(e.message); setStartingNew(false) }
    }

    // Real per-room numbers (not marketing copy) — a brand-new room honestly shows 0s.
    const withHabits = players.filter((p) => p.habits.length > 0)
    const avgStreak = withHabits.length
      ? Math.round(withHabits.reduce((s, p) => s + streak(p.habits, entriesByHabit, days), 0) / withHabits.length)
      : 0
    const avgCompletion = withHabits.length
      ? Math.round(withHabits.reduce((s, p) => s + dayCompletion(p.habits, entriesByHabit, date).pct, 0) / withHabits.length)
      : 0

    return (
      <div className="login-wrap">
        <div className="login-left">
          <div className="brand"><div className="brand-icon">🏆</div>Habit Arena</div>
          <div className="login-hero">
            <h1>Compete on your<br /><span>daily habits.</span></h1>
            <p>Set your own habits, tick them off, and climb a live leaderboard with your crew — streaks, stats, and trash talk included.</p>
            <div className="login-stats">
              <div className="login-stat"><div className="num">{players.length}</div><div className="lbl">{players.length === 1 ? 'member' : 'members'} in this room</div></div>
              <div className="login-stat"><div className="num">{avgStreak} day{avgStreak === 1 ? '' : 's'}</div><div className="lbl">avg. streak</div></div>
              <div className="login-stat"><div className="num">{avgCompletion}%</div><div className="lbl">today's completion</div></div>
            </div>
          </div>
        </div>
        <div className="login-right">
          <h2>Join the arena</h2>
          <div className="sub">Pick an avatar and a name to jump in.</div>
          <div className="avatar-grid avatar-pick">
            {AVATARS.map((a) => (
              <button key={a} type="button" className={'avatar-opt ava' + (a === avatar ? ' selected on' : '')} onClick={() => setAvatar(a)}>{a}</button>
            ))}
          </div>
          <input className="field" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()} />
          <input className="field" type="email" placeholder="Email (optional — lets you find your groups on other devices)"
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()} />
          <button className={'btn-primary' + (joining ? ' loading' : '')} onClick={join} disabled={joining || !name.trim()}>
            {joining ? 'Joining…' : 'Join competition →'}
          </button>
          <div className="divider">or</div>
          <button className={'btn-outline' + (startingNew ? ' loading' : '')} onClick={startNew} disabled={startingNew}>
            {startingNew ? 'Creating…' : 'Start a new competition'}
          </button>
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
  function onLeave() {
    if (!window.confirm('Leave this room on this device? You can re-join with the invite link any time.')) return
    leaveRoom(room.id)
    navigate('/')
  }

  const total = totalScore(me.habits, entriesByHabit, days)
  const week = weekScore(me.habits, entriesByHabit, days)
  const streakVal = streak(me.habits, entriesByHabit, days)
  const level = levelFor(total)
  const comp = dayCompletion(me.habits, entriesByHabit, date)
  const debt = playerBankDebt(me.habits, entriesByHabit, days)
  const myRank = rankedIds(players, entriesByHabit, days).indexOf(me.id) + 1
  const doneToday = me.habits.filter((h) => dayDone(entriesByHabit, h.id, date)).length
  const daysSince = Math.max(1, Math.floor((new Date(date) - new Date(room.created_at)) / 86400000) + 1)

  return (
    <div className="dash-shell">
      <aside className="sidebar">
        <div className="side-brand"><span className="dot">🏆</span>Habit Arena</div>

        <div className="nav-group-label">Menu</div>
        {NAV.map((n) => (
          <button key={n.id} className={'nav-item' + (view === n.id ? ' active' : '')} onClick={() => setView(n.id)}>
            {n.icon} {n.label}
            {n.id === 'habits' && <span className="badge">{me.habits.length}</span>}
          </button>
        ))}

        <div className="nav-group-label">General</div>
        <button className={'nav-item' + (view === 'settings' ? ' active' : '')} onClick={() => setView('settings')}>⚙️ Settings</button>
        <button className="nav-item" onClick={onLeave}>🚪 Leave room</button>
      </aside>

      <main className="dash-main">
        <div className="top-row">
          <div>
            <h1>Room {code}</h1>
            <p>Room {code} · {players.length} member{players.length === 1 ? '' : 's'} · Day {daysSince}</p>
          </div>
          <div className="user-chip">
            <div className="av">{me.avatar}</div>
            <div>
              <div className="name">{me.display_name}</div>
              <div className="rank">Rank #{myRank}</div>
            </div>
          </div>
        </div>

        <div className="switcher">
          <button className="switcher-btn" onClick={() => setSwitcherOpen((s) => !s)}>
            <Users size={15} /> Switch group <ChevronDown size={14} />
          </button>
          {switcherOpen && (
            <div className="switcher-menu">
              {savedRooms().map((r) => (
                <button key={r.roomId} className={'switcher-item' + (r.code === code ? ' current' : '')}
                  onClick={() => { setSwitcherOpen(false); if (r.code !== code) navigate(`/room/${r.code}`) }}>
                  {r.name ? `${r.name}'s room` : 'Room'} <code>{r.code}</code>
                </button>
              ))}
              <Link to="/" className="switcher-item new"><Plus size={14} /> Start / join another</Link>
            </div>
          )}
        </div>

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

        {view === 'dashboard' && (
          <DashboardOverview
            me={me} players={players} entriesByHabit={entriesByHabit} days={days}
            total={total} week={week} streakVal={streakVal} myRank={myRank} doneToday={doneToday}
            room={room}
          />
        )}

        {view === 'habits' && (
          <>
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
              </>
            )}
          </>
        )}

        {view === 'leaderboard' && (
          <Leaderboard players={players} entriesByHabit={entriesByHabit} days={days} meId={me.id} />
        )}

        {view === 'chat' && <ChatPanel mode="inline" room={room} players={players} me={me} />}

        {view === 'stats' && <StatsPanel habits={me.habits} entriesByHabit={entriesByHabit} days={days} />}

        {view === 'settings' && <SettingsView me={me} onChanged={reload} />}

        {error && <p className="errline">{error}</p>}
        <footer>Room {code} · everyone updates live</footer>
      </main>
    </div>
  )
}

// ---- dashboard overview: stat cards, week chart, completion donut, leaderboard + chat previews ----
function DashboardOverview({ me, players, entriesByHabit, days, total, week, streakVal, myRank, doneToday, room }) {
  const last7 = days.slice(-7)
  const bars = last7.map((d) => ({
    label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })[0],
    pct: dayCompletion(me.habits, entriesByHabit, d).pct,
  }))
  const rate = completionRate(me.habits, entriesByHabit, last7)

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card hero">
          <div className="lbl">Current streak</div>
          <div className="val">{streakVal} day{streakVal === 1 ? '' : 's'}</div>
          <div className="foot">{streakVal > 0 ? '🔥 keep it going' : 'Log a habit to start one'}</div>
        </div>
        <div className="stat-card light">
          <div className="lbl">Habits today</div>
          <div className="val">{doneToday}/{me.habits.length}</div>
          <div className="foot">{Math.max(0, me.habits.length - doneToday)} remaining</div>
        </div>
        <div className="stat-card light">
          <div className="lbl">Room rank</div>
          <div className="val">#{myRank}</div>
          <div className="foot">of {players.length} player{players.length === 1 ? '' : 's'}</div>
        </div>
        <div className="stat-card light">
          <div className="lbl">Total points</div>
          <div className="val">{total}</div>
          <div className="foot">{week >= 0 ? '+' : ''}{week} this week</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>This week</h3>
          <div className="week-bars">
            {bars.map((b, i) => (
              <div key={i} className={'bar' + (b.pct >= 80 ? ' high' : '')} style={{ height: `${Math.max(4, b.pct)}%` }}>
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Completion rate</h3>
          {/* ponytail: two-band conic (done vs. rest) — our data model has no
              partial-credit tier to justify the mockup's third color stop. */}
          <div className="donut-mini-wrap">
            <div className="donut-mini" style={{ background: `conic-gradient(#E50914 0% ${rate}%, #2a2a30 ${rate}% 100%)` }}>
              <div className="donut-mini-inner">
                <div className="pct">{rate}%</div>
                <div className="sub">this week</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <Leaderboard players={players} entriesByHabit={entriesByHabit} days={days} meId={me.id} limit={4} />
        <ChatPanel mode="preview" room={room} players={players} me={me} />
      </div>
    </>
  )
}

function SettingsView({ me, onChanged }) {
  const [name, setName] = useState(me.display_name)
  const [avatar, setAvatar] = useState(me.avatar)
  const [email, setEmail] = useState(me.email || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await updatePlayer(me.id, { display_name: name.trim(), avatar, email: email.trim() || null })
      await onChanged()
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="card">
      <h2>Settings</h2>
      <div className="avatar-pick">
        {AVATARS.map((a) => (
          <button key={a} className={'ava' + (a === avatar ? ' on' : '')} onClick={() => setAvatar(a)}>{a}</button>
        ))}
      </div>
      <div className="addrow">
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <input className="email-opt" type="email" placeholder="Email (optional)" value={email}
        onChange={(e) => setEmail(e.target.value)} />
      <button onClick={save} disabled={saving || !name.trim()} style={{ marginTop: 12 }}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
      {error && <p className="errline">{error}</p>}
    </div>
  )
}

function Centered({ children }) {
  return <div className="wrap"><div className="card center">{children}</div></div>
}
