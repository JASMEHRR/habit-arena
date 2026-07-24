// Data-access layer: everything that talks to Supabase lives here so the
// React components stay small and readable.
import { supabase } from '../supabaseClient.js'
import { todayStr } from '../scoring.js'

// Remember which player this device is, per room, so a returning visitor
// stays "logged in" without any password.
const playerKey = (roomId) => `habit-arena:${roomId}`
export function savedPlayerId(roomId) {
  return localStorage.getItem(playerKey(roomId))
}
function rememberPlayer(roomId, playerId) {
  localStorage.setItem(playerKey(roomId), playerId)
}

// Short, human-friendly invite code (no confusing 0/O/1/I characters).
function makeInviteCode(len = 6) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

// Create a room and return its invite code. The creator joins separately
// (on the room page) so the same join flow is used for both players.
export async function createRoom() {
  // Retry a couple of times in the unlikely event of a code collision.
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

// Join a room as a new player. Enforces the 2-player limit in app logic.
// If this device already belongs to the room, returns the existing player.
export async function joinRoom(code, displayName) {
  const room = await getRoomByCode(code)
  if (!room) throw new Error('Room not found. Check the invite link.')

  const existingId = savedPlayerId(room.id)
  if (existingId) {
    const { data } = await supabase.from('players').select('*').eq('id', existingId).maybeSingle()
    if (data) return data // already a member of this room on this device
  }

  const { data: players, error: countErr } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', room.id)
  if (countErr) throw countErr
  if (players.length >= 2) throw new Error('This room is full (2 players max).')

  const { data: player, error } = await supabase
    .from('players')
    .insert({ room_id: room.id, display_name: displayName })
    .select()
    .single()
  if (error) throw error
  rememberPlayer(room.id, player.id)
  return player
}

// Load the whole room in one shot: room + both players, each with their
// habits and today's entries folded into a { habitId: done } map.
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

  const habitIds = habits.map((h) => h.id)
  let entries = []
  if (habitIds.length) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .in('habit_id', habitIds)
      .eq('date', date)
    if (error) throw error
    entries = data
  }

  const doneByHabit = {}
  for (const e of entries) doneByHabit[e.habit_id] = e.done

  const playersFull = players.map((p) => ({
    ...p,
    habits: habits.filter((h) => h.player_id === p.id),
    doneByHabit, // shared map, keyed by habit id (unique across players)
  }))

  return { room, players: playersFull, doneByHabit, date }
}

export async function addHabit(playerId, { label, kind, points, bad_mode }) {
  const { error } = await supabase.from('habits').insert({
    player_id: playerId,
    label,
    kind,
    points,
    bad_mode: kind === 'bad' ? bad_mode : null,
  })
  if (error) throw error
}

// Set today's done state for a habit. Upsert keeps one row per habit+date.
export async function setEntry(habitId, date, done) {
  const { error } = await supabase
    .from('entries')
    .upsert({ habit_id: habitId, date, done }, { onConflict: 'habit_id,date' })
  if (error) throw error
}

// Subscribe to any change on players/habits/entries and call `cb` so the
// caller can reload room state. One channel keeps it simple.
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
