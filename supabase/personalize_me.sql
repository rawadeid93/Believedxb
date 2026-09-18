-- BELIEVE PERFORMANCE — run this AFTER you've created your own account in the app.
-- Replace 'you@example.com' below with the exact email you signed up with, then run.

do $$
declare
  v_email text := 'you@example.com'; -- <-- CHANGE THIS
  v_user_id uuid;
  v_block_id uuid := '11111111-1111-1111-1111-111111111111';
  v_week1 record;
  v_mw_id uuid;
  v_offset text;
begin
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'No account found for %. Sign up in the app first, then re-run this.', v_email;
  end if;

  update public.members set current_block_id = v_block_id where user_id = v_user_id;

  for v_week1 in
    select * from public.workouts where block_id = v_block_id and week_number = 1 order by day_of_week
  loop
    v_offset := (7 - v_week1.day_of_week)::text || ' days';

    insert into public.member_workouts (member_id, workout_id, status, completed_at)
    values (v_user_id, v_week1.id, 'complete', now() - v_offset::interval)
    returning id into v_mw_id;

    insert into public.exercise_logs (
      member_workout_id, workout_exercise_id, weight_kg, reps, time_seconds, distance_m, calories, rpe, logged_at
    )
    select
      v_mw_id, we.id,
      case when e.category = 'strength' then round((40 + random() * 60)::numeric, 1) end,
      case when e.category = 'strength' then (6 + floor(random() * 4))::int end,
      case when e.category in ('engine','conditioning') then (120 + floor(random() * 180))::int end,
      case when e.category in ('engine','conditioning') then (300 + floor(random() * 400))::int end,
      case when e.category in ('engine','conditioning') then (10 + floor(random() * 20))::int end,
      (6 + floor(random() * 3))::numeric,
      now() - v_offset::interval
    from public.workout_exercises we
    join public.exercises e on e.id = we.exercise_id
    where we.workout_id = v_week1.id;
  end loop;

  -- Realistic starting point: a 7-day streak from Week 1, ready to extend today.
  update public.members
    set streak_count = 7,
        commitment_points = (7 * 5) + 20, -- 7 workouts + the Week 1 completion bonus
        last_workout_date = current_date - 1
    where user_id = v_user_id;
end $$;
