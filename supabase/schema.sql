-- BELIEVE PERFORMANCE — MVP schema (core member loop)
-- Run this in Supabase SQL Editor before anything else.

create extension if not exists "pgcrypto";

-- ─── IDENTITY ────────────────────────────────────────────────────────────

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('member','coach','admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references public.users(id) on delete cascade,
  full_name text not null,
  join_date date not null default current_date,
  active boolean not null default true,
  current_block_id uuid, -- FK added after training_blocks exists
  streak_count int not null default 0,
  commitment_points int not null default 0,
  last_workout_date date
);

-- ─── PROGRAM STRUCTURE (coach-authored) ─────────────────────────────────

create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  weeks_total int not null default 8,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.members
  add constraint members_current_block_fk
  foreign key (current_block_id) references public.training_blocks(id);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.training_blocks(id) on delete cascade,
  week_number int not null,
  day_of_week int not null check (day_of_week between 1 and 7), -- 1 = Monday
  workout_type text not null check (
    workout_type in ('lower','engine','upper','full_body','conditioning','hyrox')
  ),
  title text not null,
  unique (block_id, week_number, day_of_week)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text, -- 'strength' | 'engine' | 'conditioning' | 'mobility' etc — drives which log fields show
  video_url text,
  instructions text
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index int not null default 0,
  sets int,
  reps text,
  tempo text,
  rest_seconds int,
  target_pct_or_rpe text,
  coach_notes text
);

-- ─── MEMBER ACTIVITY ─────────────────────────────────────────────────────

create table public.member_workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(user_id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','complete')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (member_id, workout_id)
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  member_workout_id uuid not null references public.member_workouts(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  weight_kg numeric,
  reps int,
  time_seconds int,
  distance_m numeric,
  calories int,
  rpe numeric,
  notes text,
  logged_at timestamptz not null default now(),
  unique (member_workout_id, workout_exercise_id)
);

-- ─── SCORING (rules table so points are editable later without code changes) ─

create table public.leaderboard_rules (
  event_type text primary key,
  points int not null
);

insert into public.leaderboard_rules (event_type, points) values
  ('workout_completed', 5),
  ('week_complete_bonus', 20);

-- ─── AUTO-PROVISION member row on signup ─────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  insert into public.members (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.training_blocks enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.member_workouts enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.leaderboard_rules enable row level security;

create policy "users read own row" on public.users
  for select using (auth.uid() = id);

create policy "members read own row" on public.members
  for select using (auth.uid() = user_id);

create policy "members update own row" on public.members
  for update using (auth.uid() = user_id);

-- Program content is read-only for every authenticated member.
create policy "authenticated read blocks" on public.training_blocks
  for select using (auth.role() = 'authenticated');
create policy "authenticated read workouts" on public.workouts
  for select using (auth.role() = 'authenticated');
create policy "authenticated read exercises" on public.exercises
  for select using (auth.role() = 'authenticated');
create policy "authenticated read workout_exercises" on public.workout_exercises
  for select using (auth.role() = 'authenticated');
create policy "authenticated read leaderboard_rules" on public.leaderboard_rules
  for select using (auth.role() = 'authenticated');

-- A member can only see and write their own activity.
create policy "member reads own workouts" on public.member_workouts
  for select using (auth.uid() = member_id);
create policy "member inserts own workouts" on public.member_workouts
  for insert with check (auth.uid() = member_id);
create policy "member updates own workouts" on public.member_workouts
  for update using (auth.uid() = member_id);

create policy "member reads own logs" on public.exercise_logs
  for select using (
    exists (
      select 1 from public.member_workouts mw
      where mw.id = exercise_logs.member_workout_id and mw.member_id = auth.uid()
    )
  );
create policy "member writes own logs" on public.exercise_logs
  for insert with check (
    exists (
      select 1 from public.member_workouts mw
      where mw.id = exercise_logs.member_workout_id and mw.member_id = auth.uid()
    )
  );
create policy "member updates own logs" on public.exercise_logs
  for update using (
    exists (
      select 1 from public.member_workouts mw
      where mw.id = exercise_logs.member_workout_id and mw.member_id = auth.uid()
    )
  );
