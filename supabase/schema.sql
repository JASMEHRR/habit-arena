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

-- Up to 2 players per room (the 2-player limit is enforced in the app).
create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms(id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now()
);

-- A habit belongs to one player.
--   kind 'good'  -> earns points when done.
--   kind 'bad'   -> uses bad_mode:
--     'reward_avoid' : points for NOT doing it (avoiding).
--     'penalty_do'   : negative points if you DO it.
--     'both'         : points for avoiding, penalty for doing.
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
-- This is a casual, non-sensitive game, and there is NO server-side login,
-- so we intentionally allow the public "anon" role to read and write freely.
-- If you later add real accounts, tighten these policies.
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
