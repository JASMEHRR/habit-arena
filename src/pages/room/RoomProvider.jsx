// One place that loads a room, subscribes to it, and exposes the mutations.
//
// Room.jsx was 471 lines holding three screens, two inline sub-components, all
// the data loading and all the mutations. Splitting the screens into routes
// means they must share one subscription rather than each opening their own, so
// the loading lives here and the views read it from context.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  loadRoomState, subscribeRoom, setEntryValue, removeHabit, updateHabit, deleteEntry, sendMessage,
  listMyRooms, leaveRoom, deleteRoom, updateRoomTarget, pointTargetFor,
} from '../../lib/rooms.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { todayStr } from '../../scoring.js'
import { dayCompletion, streak, rankedIds } from '../../stats.js'
import { useToast } from '../../components/ui/Toast.jsx'
import { useReducedMotion } from '../../hooks.js'

const RoomContext = createContext(null)

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside <RoomProvider>')
  return ctx
}

export function RoomProvider({ children }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const toast = useToast()
  const reducedMotion = useReducedMotion()

  const [state, setState] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [myRooms, setMyRooms] = useState([])

  const reload = useCallback(async () => {
    try {
      const s = await loadRoomState(code, todayStr())
      if (!s) return setStatus('notfound')
      setState(s)
      setStatus('ready')
    } catch (e) {
      setLoadError(e.message || 'Failed to load room.')
      setStatus('error')
    }
  }, [code])

  useEffect(() => {
    reload()
    return subscribeRoom(reload)
  }, [reload])

  // The group switcher silently showed nothing when this failed. It reports now.
  useEffect(() => {
    listMyRooms(session.user.id)
      .then(setMyRooms)
      .catch((e) => toast.error(e))
  }, [session.user.id, code, toast])

  const me = state?.players.find((p) => p.user_id === session.user.id) || null

  // ---- celebrations: 100% of a day, a 7-day streak, and taking #1 ----
  const prevPctRef = useRef(null)
  const streakRef = useRef(null)
  const rankRef = useRef(null)
  useEffect(() => {
    if (!state || !me || me.habits.length === 0) return
    const comp = dayCompletion(me.habits, state.entriesByHabit, state.date)
    const sv = streak(me.habits, state.entriesByHabit, state.days)
    const rank = rankedIds(state.players, state.entriesByHabit, state.days).indexOf(me.id) + 1
    const first = prevPctRef.current === null

    // Confetti asks about reduced motion; it never did before.
    const burst = (opts) => {
      if (!reducedMotion) confetti(opts)
    }

    if (!first && prevPctRef.current < 100 && comp.pct >= 100) {
      burst({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.35 },
        // The four planes, so even the confetti belongs to the world.
        colors: ['#e43d24', '#1e3a8a', '#c8a24b', '#111111'],
      })
      sendMessage(state.room.id, me.id, `${me.display_name} completed the whole day.`, true).catch(() => {})
    }
    if (!first && sv > streakRef.current && sv % 7 === 0) {
      sendMessage(state.room.id, me.id, `${me.display_name} is on a ${sv}-day streak.`, true).catch(() => {})
    }
    if (!first && rank === 1 && rankRef.current > 1 && state.players.length > 1) {
      burst({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#c8a24b', '#e43d24', '#1e3a8a'],
      })
      sendMessage(state.room.id, me.id, `${me.display_name} took the lead.`, true).catch(() => {})
    }
    prevPctRef.current = comp.pct
    streakRef.current = sv
    rankRef.current = rank
  }, [state, me, reducedMotion])

  // ---- mutations ----
  // Optimistic so a mark lands instantly; realtime or a reload confirms it.
  // Failures now surface as a toast next to the thumb instead of in a paragraph
  // at the bottom of the page.
  const setValue = useCallback(
    async (habitId, value, target) => {
      setState((s) => {
        if (!s) return s
        const eb = { ...s.entriesByHabit, [habitId]: { ...(s.entriesByHabit[habitId] || {}) } }
        eb[habitId][s.date] = { value, done: value >= target }
        return { ...s, entriesByHabit: eb }
      })
      try {
        await setEntryValue(habitId, state.date, value, target)
      } catch (e) {
        toast.error(e)
        reload()
      }
    },
    [state?.date, reload, toast]
  )

  const value = useMemo(
    () => ({
      code,
      status,
      loadError,
      state,
      me,
      myRooms,
      reload,
      setValue,
      isOwner: state?.room.created_by === session.user.id,
      profile,
      userId: session.user.id,
      pointTarget: pointTargetFor(state?.room),
      removeHabit: (id) => toast.report(async () => { await removeHabit(id); await reload() }),
      editHabit: (id, patch) => toast.report(async () => { await updateHabit(id, patch); await reload() }),
      deleteEntry: (id, date) => toast.report(async () => { await deleteEntry(id, date); await reload() }),
      updatePointTarget: (target) =>
        toast.report(async () => {
          await updateRoomTarget(state.room.id, target)
          await reload()
        }),
      leave: () =>
        toast.report(async () => {
          await leaveRoom(me.id)
          navigate('/')
        }),
      destroy: () =>
        toast.report(async () => {
          await deleteRoom(state.room.id)
          navigate('/')
        }),
    }),
    [code, status, loadError, state, me, myRooms, reload, setValue, session.user.id, profile, toast, navigate]
  )

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}
