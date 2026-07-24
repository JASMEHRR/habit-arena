-- Habit Arena — database schema
-- HOW TO USE: open your Supabase project -> SQL Editor -> New query,
-- paste this entire file, and click "Run". Safe to run more than once.

-- gen_random_uuid() lives in the pgcrypto extension.
create extension if not exists pgcrypto;

-- A competition room. The invite_code is the short string shared in the URL.
create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at  timestamptz not null default now()
);

-- V4.1: who created the room, so only they can delete it. Rooms created
-- before this column existed have created_by = null and simply can't be
-- deleted (no owner to attribute it to).
alter table rooms add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Up to 2 players per room (the 2-player limit is enforced in the app).
create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms(id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now()
);

-- A habit belongs to one player.
--   kind 'good'  -> earns points when done (see V5 below for penalty_if_skipped).
--   kind 'bad'   -> uses bad_mode:
--     'reward_avoid' : points for NOT doing it (avoiding), only when explicitly logged.
--     'penalty_do'   : negative points if you DO it.
--     'both'         : points for avoiding (if logged), penalty for doing.
create table if not exists habits (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  label      text not null,
  kind       text not null check (kind in ('good', 'bad')),
  points     int  not null default 1,
  bad_mode   text check (bad_mode in ('reward_avoid', 'penalty_do', 'both')),
  created_at timestamptz not null default now()
);

-- One row per habit per day. "done" means the good habit was completed,
-- or (for a bad habit) that the bad thing WAS done. Unique per habit+date.
create table if not exists entries (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references habits(id) on delete cascade,
  date       text not null, -- 'YYYY-MM-DD'
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- ---------------------------------------------------------------------------
-- Row Level Security.
-- V1-V3 had no server-side login, so the anon role was allowed to read/write
-- freely. V4 below (real accounts) replaces these open policies with
-- per-user ones — this block only exists so a fresh V1 database still works
-- until the V4 section runs and drops these policies again.
-- ---------------------------------------------------------------------------
alter table rooms   enable row level security;
alter table players enable row level security;
alter table habits  enable row level security;
alter table entries enable row level security;

-- drop-then-create so re-running the file does not error on duplicate policies.
drop policy if exists "anon full access" on rooms;
drop policy if exists "anon full access" on players;
drop policy if exists "anon full access" on habits;
drop policy if exists "anon full access" on entries;

create policy "anon full access" on rooms   for all to anon using (true) with check (true);
create policy "anon full access" on players for all to anon using (true) with check (true);
create policy "anon full access" on habits  for all to anon using (true) with check (true);
create policy "anon full access" on entries for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes so both players' screens update live.
-- Add the tables to the supabase_realtime publication (ignore if already added).
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table habits;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table entries;
exception when duplicate_object then null;
end $$;

-- ===========================================================================
-- V2 ADDITIONS (gamified group competition: avatars, targets, bank, chat).
-- All statements are idempotent — safe to re-run over a V1 database.
-- ===========================================================================

-- Players: avatar emoji + cached streak (day count of consecutive full days).
alter table players add column if not exists avatar text not null default '🙂';
alter table players add column if not exists streak int not null default 0;

-- Habits: an icon keyword, a color, a numeric target with unit, and whether
-- the habit feeds the "Bank" (numeric health targets like sleep/water).
alter table habits add column if not exists icon    text not null default 'check';
alter table habits add column if not exists color   text not null default '#7c6cff';
alter table habits add column if not exists target  int  not null default 1;   -- reps or units per day
alter table habits add column if not exists unit    text not null default '';  -- '', 'hours', 'glasses'
alter table habits add column if not exists is_bank boolean not null default false;

-- Entries: `value` holds the logged amount (reps done, hours slept, glasses).
-- `done` stays as a convenience flag (value >= target). Existing rows default 0.
alter table entries add column if not exists value numeric not null default 0;

-- Group chat, one row per message, scoped to a room.
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  player_id  uuid references players(id) on delete set null, -- null = system message
  body       text not null,
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
drop policy if exists "anon full access" on messages;
create policy "anon full access" on messages for all to anon using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;

-- ===========================================================================
-- V3: email-based cross-device recovery (still no passwords).
-- A player can optionally attach an email so they can find their groups
-- from a different device/browser later, by looking up players.email.
-- ===========================================================================
alter table players add column if not exists email text;
create index if not exists players_email_idx on players (lower(email));

-- ===========================================================================
-- V4: real accounts (Supabase Auth email+password), replacing the localStorage
-- device-identity hack. One profile per auth user, reused across every room;
-- one player row per (room, user) pair.
-- ===========================================================================

-- Global profile: display name + avatar you carry into every room.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  avatar       text not null default '🙂',
  email        text,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile the moment someone signs up. display_name/avatar come
-- from the signup form via auth metadata (see src/lib/auth.js signUp()).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar', '🙂'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Editing your profile (Settings) should update every room you're already in,
-- since display_name/avatar/email on `players` are a denormalized copy kept
-- for the existing frontend queries.
create or replace function public.sync_profile_to_players()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.players
  set display_name = new.display_name, avatar = new.avatar, email = new.email
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_profile_updated on profiles;
create trigger on_profile_updated
  after update on profiles
  for each row execute procedure public.sync_profile_to_players();

-- One player row per (room, user) — replaces the old "one device = one
-- anonymous player" model. Existing rows (created before accounts existed)
-- have user_id null and are simply inert/unreachable under the new policies.
alter table players add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists players_room_user_idx on players (room_id, user_id);

-- ---------------------------------------------------------------------------
-- Tighten Row Level Security now that we have real accounts. Everyone signed
-- in can still read everything inside a room they belong to (needed for the
-- leaderboard, chat, and stats), but can only write rows that are their own.
-- ---------------------------------------------------------------------------
drop policy if exists "anon full access" on rooms;
drop policy if exists "anon full access" on players;
drop policy if exists "anon full access" on habits;
drop policy if exists "anon full access" on entries;
drop policy if exists "anon full access" on messages;

alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Helper functions used by the policies below. A policy on `players` cannot
-- query `players` again inside its own USING clause — Postgres reports
-- "infinite recursion detected in policy for relation players" — so these
-- run as `security definer` (owned by a role with bypassrls, per Supabase's
-- documented pattern for this exact problem) to look up your membership
-- without re-triggering RLS on the same table.
create or replace function public.my_room_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select room_id from players where user_id = auth.uid();
$$;
grant execute on function public.my_room_ids() to authenticated;

create or replace function public.my_player_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from players where user_id = auth.uid();
$$;
grant execute on function public.my_player_ids() to authenticated;

-- Room rows are only readable by their members OR their creator (NOT "any
-- authenticated user" — that would let anyone enumerate every invite code
-- and self-join any room). The creator clause matters because createRoom()
-- inserts the room, then RETURNING-selects it, BEFORE the creator's player
-- row exists (that happens in the joinRoom() call right after) — without
-- it, Postgres reports the insert itself as an RLS violation, since it
-- can't prove the inserting session is allowed to see the row it just made.
-- Looking a room up BY invite code — needed before you've joined it at all
-- — goes through the security-definer function below instead.
drop policy if exists "read my rooms" on rooms;
drop policy if exists "authenticated create rooms" on rooms;
drop policy if exists "delete own rooms" on rooms;
create policy "read my rooms" on rooms for select to authenticated
  using (id in (select public.my_room_ids()) or created_by = auth.uid());
create policy "authenticated create rooms" on rooms for insert to authenticated with check (true);
create policy "delete own rooms" on rooms for delete to authenticated
  using (created_by = auth.uid());

-- Resolve an invite code to its room without exposing the rest of the table.
create or replace function public.get_room_by_code(p_code text)
returns setof rooms
language sql
security definer
stable
set search_path = public
as $$
  select * from rooms where invite_code = p_code limit 1;
$$;
grant execute on function public.get_room_by_code(text) to authenticated;

-- Read: only player rows in rooms you're also a member of.
drop policy if exists "read players in my rooms" on players;
drop policy if exists "insert own player row" on players;
drop policy if exists "update own player row" on players;
drop policy if exists "delete own player row" on players;
-- `or user_id = auth.uid()` covers the same INSERT+RETURNING gotcha as
-- rooms above: joinRoom() inserts your player row and immediately
-- RETURNING-selects it, before my_room_ids() would otherwise say you
-- belong to that room.
create policy "read players in my rooms" on players for select to authenticated
  using (room_id in (select public.my_room_ids()) or user_id = auth.uid());
-- Write: only your own player row.
create policy "insert own player row" on players for insert to authenticated
  with check (user_id = auth.uid());
create policy "update own player row" on players for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own player row" on players for delete to authenticated
  using (user_id = auth.uid());

-- Habits: read any habit belonging to a player in one of your rooms; write
-- only habits attached to your own player row.
drop policy if exists "read habits in my rooms" on habits;
drop policy if exists "manage own habits" on habits;
drop policy if exists "update own habits" on habits;
drop policy if exists "delete own habits" on habits;
create policy "read habits in my rooms" on habits for select to authenticated
  using (player_id in (select id from players where room_id in (select public.my_room_ids())));
create policy "manage own habits" on habits for insert to authenticated
  with check (player_id in (select public.my_player_ids()));
create policy "update own habits" on habits for update to authenticated
  using (player_id in (select public.my_player_ids()))
  with check (player_id in (select public.my_player_ids()));
create policy "delete own habits" on habits for delete to authenticated
  using (player_id in (select public.my_player_ids()));

-- Entries: same room-membership read, own-habit write.
drop policy if exists "read entries in my rooms" on entries;
drop policy if exists "manage own entries" on entries;
drop policy if exists "update own entries" on entries;
drop policy if exists "delete own entries" on entries;
create policy "read entries in my rooms" on entries for select to authenticated
  using (habit_id in (
    select h.id from habits h join players p on p.id = h.player_id
    where p.room_id in (select public.my_room_ids())
  ));
create policy "manage own entries" on entries for insert to authenticated
  with check (habit_id in (select id from habits where player_id in (select public.my_player_ids())));
create policy "update own entries" on entries for update to authenticated
  using (habit_id in (select id from habits where player_id in (select public.my_player_ids())))
  with check (habit_id in (select id from habits where player_id in (select public.my_player_ids())));
create policy "delete own entries" on entries for delete to authenticated
  using (habit_id in (select id from habits where player_id in (select public.my_player_ids())));

-- Messages: read within your rooms; you may only send as yourself (or as a
-- system message, player_id null, which the app sends after real events).
drop policy if exists "read messages in my rooms" on messages;
drop policy if exists "send messages in my rooms" on messages;
create policy "read messages in my rooms" on messages for select to authenticated
  using (room_id in (select public.my_room_ids()));
create policy "send messages in my rooms" on messages for insert to authenticated
  with check (
    room_id in (select public.my_room_ids())
    and (player_id is null or player_id in (select public.my_player_ids()))
  );

-- ===========================================================================
-- V5: equal daily point budget. Every player gets the same 3 mandatory
-- habits (seeded by the app on join, see src/lib/rooms.js MANDATORY_HABITS)
-- worth a fixed number of points each, plus the same custom-habit point
-- budget for whatever else they add — so everyone's maximum possible day is
-- identical regardless of how many habits they personally set up.
-- ===========================================================================
alter table habits add column if not exists is_mandatory boolean not null default false;
-- A 'good' habit that costs you points if skipped, not just 0 — used for
-- mandatory habits ("brush your teeth or lose the points"), unlike a normal
-- optional good habit which is 0 (never negative) when skipped.
alter table habits add column if not exists penalty_if_skipped boolean not null default false;

-- ===========================================================================
-- V5.1: claim pre-auth rooms. Rooms/players created before accounts existed
-- have players.user_id = null, so they're invisible under the new
-- membership-based RLS (nothing to attach them to). A player who set an
-- email on one of those old rows can re-link it to their real account by
-- providing that same email — same trust model as the old (pre-auth)
-- "find my groups by email" feature, just re-attaching for real this time.
-- ===========================================================================
create or replace function public.claim_orphaned_players(p_email text)
returns table(player_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update players set user_id = auth.uid()
  where user_id is null and email is not null and lower(email) = lower(p_email)
  returning id;
end;
$$;
grant execute on function public.claim_orphaned_players(text) to authenticated;

-- Force PostgREST to reload its schema cache so new tables/columns are
-- visible immediately, even when this file is run via the SQL Editor.
notify pgrst, 'reload schema';
