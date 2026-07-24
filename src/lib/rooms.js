// Data-access layer: everything that talks to Supabase lives here so the
// React components stay small and readable.
import { supabase } from '../supabaseClient.js'
import { todayStr, lastNDays } from '../scoring.js'

// How many days of entry history to load (for dot-strips, charts, streaks, bank).
export const HISTORY_DAYS = 30

// Remember which player this device is, per room, so a returning visitor
// stays "logged in" without any password.
const playerKey = (roomId) => `habit-arena:${roomId}`
export function savedPlayerId(roomId) {
  return localStorage.getItem(playerKey(roomId))
}
function rememberPlayer(roomId, playerId) {
  localStorage.setItem(playerKey(roomId), playerId)
}

// Index of every room this device has joined, so the user can see & switch
// between all their competitions. [{ roomId, code, name }] newest last.
const ROOMS_KEY = 'habit-arena:rooms'
export function savedRooms() {
  try {
    return JSON.parse(localStorage.getItem(ROOMS_KEY)) || []
  } catch {
    return []
  }
}
function rememberRoom(roomId, code, name) {
  const rooms = savedRooms().filter((r) => r.roomId !== roomId)
  rooms.push({ roomId, code, name })
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
}

// Short, human-friendly invite code (no confusing 0/O/1/I characters).
function makeInviteCode(len = 6) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

// Create a room and return its invite code. The creator joins on the room page.
export async function createRoom() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = makeInviteCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ invite_code })
      .select()
      .single()
    if (!error) return data.invite_code
    if (error.code !== '23505') throw error // 23505 = unique violation, retry
  }
  throw new Error('Could not generate a unique invite code, please try again.')
}

export async function getRoomByCode(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle()
  if (error) throw error
  return data // null if not found
}

// Join a room as a new player (unlimited players per room in V2).
// If this device already belongs to the room, returns the existing player.
export async function joinRoom(code, displayName, avatar = '🙂') {
  const room = await getRoomByCode(code)
  if (!room) throw new Error('Room not found. Check the invite link.')

  const existingId = savedPlayerId(room.id)
  if (existingId) {
    const { data } = await supabase.from('players').select('*').eq('id', existingId).maybeSingle()
    if (data) { rememberRoom(room.id, code, data.display_name); return data } // already a member
  }

  const { data: player, error } = await supabase
    .from('players')
    .insert({ room_id: room.id, display_name: displayName, avatar })
    .select()
    .single()
  if (error) throw error
  rememberPlayer(room.id, player.id)
  rememberRoom(room.id, code, displayName)
  return player
}

// Copy this device's habits from another of its rooms into the current player.
// Returns how many habits were copied.
export async function copyHabitsFrom(fromCode, toPlayerId) {
  const src = await getRoomByCode(fromCode)
  if (!src) throw new Error('That room no longer exists.')
  const srcPlayerId = savedPlayerId(src.id)
  if (!srcPlayerId) throw new Error('You are not a member of that room on this device.')

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('player_id', srcPlayerId)
    .order('created_at', { ascending: true })
  if (error) throw error

  for (const h of habits) {
    await addHabit(toPlayerId, {
      label: h.label, kind: h.kind, points: h.points, bad_mode: h.bad_mode,
      icon: h.icon, color: h.color, target: h.target, unit: h.unit, is_bank: h.is_bank,
    })
  }
  return habits.length
}

// Load the whole room: room + all players (each with habits), plus a window of
// entry history keyed as entriesByHabit[habitId][date] = { value, done }.
export async function loadRoomState(code, date = todayStr()) {
  const room = await getRoomByCode(code)
  if (!room) return null

  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
    .order('joined_at', { ascending: true })
  if (pErr) throw pErr

  const playerIds = players.map((p) => p.id)
  let habits = []
  if (playerIds.length) {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .in('player_id', playerIds)
      .order('created_at', { ascending: true })
    if (error) throw error
    habits = data
  }

  const days = lastNDays(HISTORY_DAYS, date)
  const habitIds = habits.map((h) => h.id)
  let entries = []
  if (habitIds.length) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .in('habit_id', habitIds)
      .gte('date', days[0])
      .lte('date', date)
    if (error) throw error
    entries = data
  }

  const entriesByHabit = {}
  for (const e of entries) {
    ;(entriesByHabit[e.habit_id] ||= {})[e.date] = { value: Number(e.value), done: e.done }
  }

  // Convenience: today's done map, keyed by habit id (unique across players).
  const doneByHabit = {}
  for (const h of habits) doneByHabit[h.id] = entriesByHabit[h.id]?.[date]?.done || false

  const playersFull = players.map((p) => ({
    ...p,
    habits: habits.filter((h) => h.player_id === p.id),
  }))

  return { room, players: playersFull, entriesByHabit, doneByHabit, days, date }
}

export async function addHabit(playerId, habit) {
  const { error } = await supabase.from('habits').insert({
    player_id: playerId,
    label: habit.label,
    kind: habit.kind,
    points: habit.points,
    bad_mode: habit.kind === 'bad' ? habit.bad_mode : null,
    icon: habit.icon || 'check',
    color: habit.color || '#7c6cff',
    target: habit.target || 1,
    unit: habit.unit || '',
    is_bank: !!habit.is_bank,
  })
  if (error) throw error
}

export async function removeHabit(habitId) {
  const { error } = await supabase.from('habits').delete().eq('id', habitId)
  if (error) throw error
}

// Upsert an entry with an explicit value; `done` is derived from the target.
export async function setEntryValue(habitId, date, value, target = 1) {
  const v = Math.max(0, Number(value) || 0)
  const { error } = await supabase
    .from('entries')
    .upsert({ habit_id: habitId, date, value: v, done: v >= target }, { onConflict: 'habit_id,date' })
  if (error) throw error
}

// Toggle a simple habit done/undone (value jumps to target or back to 0).
export async function toggleEntry(habitId, date, done, target = 1) {
  return setEntryValue(habitId, date, done ? target : 0, target)
}

export async function updatePlayer(playerId, fields) {
  const { error } = await supabase.from('players').update(fields).eq('id', playerId)
  if (error) throw error
}

// ---- group chat ----
export async function loadMessages(roomId, limit = 100) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

export async function sendMessage(roomId, playerId, body, isSystem = false) {
  const text = body.trim()
  if (!text) return
  const { error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, player_id: isSystem ? null : playerId, body: text, is_system: isSystem })
  if (error) throw error
}

// Subscribe to players/habits/entries changes → reload room state.
// ponytail: reload-on-any-change; add room_id filtering if cross-room noise matters.
export function subscribeRoom(cb) {
  const channel = supabase
    .channel('habit-arena-room')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, cb)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// Subscribe to new chat messages for a room. `onInsert` gets the new row.
export function subscribeMessages(roomId, onInsert) {
  const channel = supabase
    .channel('habit-arena-chat-' + roomId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
