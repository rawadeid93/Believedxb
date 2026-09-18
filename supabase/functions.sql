-- BELIEVE PERFORMANCE — complete_workout RPC
-- Run this AFTER schema.sql.

create or replace function public.complete_workout(p_member_workout_id uuid)
returns json as $$
declare
  v_member_id uuid;
  v_workout_id uuid;
  v_block_id uuid;
  v_week_number int;
  v_current_status text;
  v_base_points int;
  v_bonus_points int;
  v_points_earned int := 0;
  v_last_workout_date date;
  v_streak int;
  v_days_since int;
  v_total_in_week int;
  v_complete_in_week int;
begin
  select mw.member_id, mw.workout_id, mw.status, w.block_id, w.week_number
    into v_member_id, v_workout_id, v_current_status, v_block_id, v_week_number
  from public.member_workouts mw
  join public.workouts w on w.id = mw.workout_id
  where mw.id = p_member_workout_id;

  if v_member_id is null then
    raise exception 'member_workout not found';
  end if;

  if v_member_id <> auth.uid() then
    raise exception 'not authorized to complete this workout';
  end if;

  -- Idempotent: completing an already-complete workout just returns current stats.
  if v_current_status = 'complete' then
    select streak_count, commitment_points into v_streak, v_points_earned
    from public.members where user_id = v_member_id;
    return json_build_object(
      'streak_count', v_streak,
      'commitment_points', v_points_earned,
      'points_earned', 0
    );
  end if;

  update public.member_workouts
    set status = 'complete', completed_at = now()
    where id = p_member_workout_id;

  select points into v_base_points from public.leaderboard_rules where event_type = 'workout_completed';
  v_points_earned := coalesce(v_base_points, 5);

  -- Week-complete bonus: award once, the moment the member finishes the last
  -- scheduled workout of that block/week.
  select count(*) into v_total_in_week
  from public.workouts where block_id = v_block_id and week_number = v_week_number;

  select count(*) into v_complete_in_week
  from public.member_workouts mw
  join public.workouts w on w.id = mw.workout_id
  where mw.member_id = v_member_id
    and w.block_id = v_block_id
    and w.week_number = v_week_number
    and mw.status = 'complete';

  if v_total_in_week > 0 and v_complete_in_week = v_total_in_week then
    select points into v_bonus_points from public.leaderboard_rules where event_type = 'week_complete_bonus';
    v_points_earned := v_points_earned + coalesce(v_bonus_points, 20);
  end if;

  -- Streak: consecutive training days, allowing a single rest day.
  select last_workout_date into v_last_workout_date from public.members where user_id = v_member_id;

  if v_last_workout_date is null then
    v_streak := 1;
  else
    v_days_since := current_date - v_last_workout_date;
    if v_days_since = 0 then
      select streak_count into v_streak from public.members where user_id = v_member_id;
    elsif v_days_since between 1 and 2 then
      select streak_count + 1 into v_streak from public.members where user_id = v_member_id;
    else
      v_streak := 1;
    end if;
  end if;

  update public.members
    set commitment_points = commitment_points + v_points_earned,
        streak_count = v_streak,
        last_workout_date = current_date
    where user_id = v_member_id;

  return (
    select json_build_object(
      'streak_count', streak_count,
      'commitment_points', commitment_points,
      'points_earned', v_points_earned
    )
    from public.members where user_id = v_member_id
  );
end;
$$ language plpgsql security definer;

grant execute on function public.complete_workout(uuid) to authenticated;
