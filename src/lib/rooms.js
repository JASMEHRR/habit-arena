// Data-access layer: everything that talks to Supabase lives here so the
// React components stay small and readable.
//
// Identity is a real Supabase Auth session now (see AuthContext/lib/auth.js).
// A "player" row is (room_id, user_id) — one per room per account — and its
// display_name/avatar/email are a denormalized copy of the account's profile
// (kept in sync by a DB trigger) so the rest of the app can keep reading
// player.display_name etc without change.
import { supabase } from '../supabaseClient.js'
import { todayStr, lastNDays } from '../scoring.js'
import { fitBatch } from '../budget.js'

// How many days of entry history to load (for dot-strips, charts, streaks, bank).
export const HISTORY_DAYS = 30

// The default daily point target for a brand-new room. It is a per-room
// setting from here on (rooms.point_target) — every member can adjust it in
// Settings, and everything downstream reads the room's actual value, falling
// back to this constant only if the column is missing (pre-migration data).
export const DAILY_POINT_TARGET = 30

// Seeded on join so a room isn't blank on day one. They are NOT protected:
// is_mandatory only drives the "shared" badge in the UI. Every field on every
// habit — including these — can be edited or removed via updateHabit/removeHabit.
// Colours are the four planes of the design system (see src/planes.js); the
// three biggest habits carry the three biggest planes of the portrait.
export const MANDATORY_HABITS = [
  { label: 'Brush teeth', icon: 'brush', color: '#c8a24b', points: 5 },
  { label: 'Drink water', icon: 'droplet', color: '#1e3a8a', points: 5 },
  { label: 'Sleep on time', icon: 'moon', color: '#111111', points: 5 },
]

// A room's actual daily point target, with a fallback for rows saved before
// the point_target column existed (or before schema.sql's V5 block has been
// run against this database).
export function pointTargetFor(room) {
  return room?.point_target ?? DAILY_POINT_TARGET
}

export async function updateRoomTarget(roomId, target) {
  const clamped = Math.max(1, Math.round(Number(target) || DAILY_POINT_TARGET))
  const { error } = await supabase.from('rooms').update({ point_target: clamped }).eq('id', roomId)
  if (error) throw error
}

async function seedMandatoryHabits(playerId) {
  for (const h of MANDATORY_HABITS) {
    await addHabit(playerId, {
      label: h.label, kind: 'good', points: h.points, icon: h.icon, color: h.color,
      target: 1, is_mandatory: true, penalty_if_skipped: true,
    })
  }
}

// Short, human-friendly invite code (no confusing 0/O/1/I characters).
function makeInviteCode(len = 6) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

// Create a room and immediately join its creator as a player. Returns the
// invite code.
export async function createRoom(userId, profile) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = makeInviteCode()
    const { data, error } = await supabase
      .from('rooms').insert({ invite_code, created_by: userId }).select().single()
    if (error) {
      if (error.code === '23505') continue // unique violation on invite_code, retry
      throw error
    }
    await joinRoom(data.invite_code, userId, profile)
    return data.invite_code
  }
  throw new Error('Could not generate a unique invite code, please try again.')
}

// Looks a room up by its invite code via a security-definer RPC (see
// supabase/schema.sql get_room_by_code) — this has to work BEFORE you've
// joined the room, so it can't depend on the "member rooms only" RLS policy.
export async function getRoomByCode(code) {
  const { data, error } = await supabase.rpc('get_room_by_code', { p_code: code }).maybeSingle()
  if (error) throw error
  return data // null if not found
}

// Permanently delete a room (and, via cascade, its players/habits/entries/
// messages). RLS restricts this to the room's creator.
export async function deleteRoom(roomId) {
  const { error } = await supabase.from('rooms').delete().eq('id', roomId)
  if (error) throw error
}

// Join a room as the signed-in account (idempotent — returns the existing
// player row if this account already belongs to the room).
export async function joinRoom(code, userId, profile) {
  const room = await getRoomByCode(code)
  if (!room) throw new Error('Room not found. Check the invite link.')

  const { data: existing, error: exErr } = await supabase
    .from('players').select('*').eq('room_id', room.id).eq('user_id', userId).maybeSingle()
  if (exErr) throw exErr
  if (existing) return existing

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      room_id: room.id, user_id: userId,
      display_name: profile.display_name, avatar: profile.avatar, email: profile.email,
    })
    .select()
    .single()
  if (error) throw error
  await seedMandatoryHabits(player.id)
  return player
}

// Every room this account belongs to, newest membership first.
export async function listMyRooms(userId) {
  const { data, error } = await supabase
    .from('players')
    .select('id, room_id, display_name, joined_at, rooms(invite_code, created_by)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
  if (error) throw error
  return data
    .filter((p) => p.rooms)
    .map((p) => ({
      playerId: p.id, roomId: p.room_id, code: p.rooms.invite_code, name: p.display_name,
      isCreator: p.rooms.created_by === userId,
    }))
}

// Re-link this account to pre-auth rooms it used to have via device-only
// "login" (players.user_id was null before accounts existed). Matches by the
// email that was optionally set on those old rows. Newly-claimed players get
// the mandatory habits seeded too, since they never had them. Returns how
// many rooms were recovered.
export async function claimOldRooms(email) {
  const { data, error } = await supabase.rpc('claim_orphaned_players', { p_email: email.trim() })
  if (error) throw error
  for (const row of data || []) await seedMandatoryHabits(row.player_id)
  return (data || []).length
}

// Remove this account from a room (deletes the player row and, via cascade,
// its habits/entries). Irreversible.
export async function leaveRoom(playerId) {
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) throw error
}

// Copy this account's own habits from another of its rooms into the current
// player (the shared starter habits are never copied — the target player
// already has their own, seeded on join). Every copied habit's points are
// fitted to the target room's budget rather than skipped if it would have
// blown it — see src/budget.js. Returns how many habits were copied.
export async function copyHabitsFrom(fromCode, userId, toPlayerId, roomPointTarget) {
  const src = await getRoomByCode(fromCode)
  if (!src) throw new Error('That room no longer exists.')
  const { data: srcPlayer, error: spErr } = await supabase
    .from('players').select('id').eq('room_id', src.id).eq('user_id', userId).maybeSingle()
  if (spErr) throw spErr
  if (!srcPlayer) throw new Error('You are not a member of that room.')

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('player_id', srcPlayer.id)
    .eq('is_mandatory', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!habits.length) return 0

  const { data: existing, error: exErr } = await supabase
    .from('habits').select('points').eq('player_id', toPlayerId)
  if (exErr) throw exErr
  const used = existing.reduce((s, h) => s + h.points, 0)
  const target = roomPointTarget ?? DAILY_POINT_TARGET

  const fitted = fitBatch(habits, used, target)
  for (const h of fitted) {
    await addHabit(toPlayerId, {
      label: h.label, kind: h.kind, points: h.points, bad_mode: h.bad_mode,
      icon: h.icon, color: h.color, target: h.target, unit: h.unit, is_bank: h.is_bank,
    })
  }
  return fitted.length
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
    is_mandatory: !!habit.is_mandatory,
    penalty_if_skipped: !!habit.penalty_if_skipped,
  })
  if (error) throw error
}

export async function removeHabit(habitId) {
  const { error } = await supabase.from('habits').delete().eq('id', habitId)
  if (error) throw error
}

// Edit any habit in place — including the three shared ones. Every field is
// writable: label, icon, colour, kind/bad_mode, target/unit, and points. There
// is no separate "is this mandatory" guard here; the caller decides what may be
// changed, this just writes it.
export async function updateHabit(habitId, fields) {
  const patch = {}
  if (fields.label !== undefined) patch.label = fields.label
  if (fields.icon !== undefined) patch.icon = fields.icon
  if (fields.color !== undefined) patch.color = fields.color
  if (fields.kind !== undefined) patch.kind = fields.kind
  if (fields.bad_mode !== undefined) patch.bad_mode = fields.kind === 'bad' ? fields.bad_mode : null
  if (fields.points !== undefined) patch.points = fields.points
  if (fields.target !== undefined) patch.target = fields.target
  if (fields.unit !== undefined) patch.unit = fields.unit
  if (fields.is_bank !== undefined) patch.is_bank = fields.is_bank
  const { error } = await supabase.from('habits').update(patch).eq('id', habitId)
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

// Delete a logged entry entirely (reverts to "not logged" for that day,
// removing whatever points it contributed) — the ledger's undo action.
export async function deleteEntry(habitId, date) {
  const { error } = await supabase.from('entries').delete().eq('habit_id', habitId).eq('date', date)
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
