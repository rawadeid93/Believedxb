-- BELIEVE PERFORMANCE — seed data
-- Run this AFTER schema.sql and functions.sql.
-- Builds one 8-week block. Only Week 1 and Week 2 get exercises programmed
-- here (enough to test the full member loop, including "last week" reference).
-- Weeks 3-8 are created empty — duplicate Week 2 in the Program Builder
-- (Phase 2) or by hand in SQL once the core loop is confirmed.

-- Block starts on last week's Monday, so "today" always falls in Week 2
-- and Week 1 is already in the past — matches what a live gym would see.
insert into public.training_blocks (id, name, start_date, weeks_total, active)
values (
  '11111111-1111-1111-1111-111111111111',
  'BELIEVE Fall Block 1',
  (date_trunc('week', current_date) - interval '7 days')::date,
  8,
  true
);

-- ─── Exercise library ──────────────────────────────────────────────────

insert into public.exercises (id, name, category, instructions) values
  ('e0000000-0000-0000-0000-000000000001', 'Back Squat', 'strength', 'Brace hard, chest tall, break parallel every rep.'),
  ('e0000000-0000-0000-0000-000000000002', 'Romanian Deadlift', 'strength', 'Soft knees, hinge from the hips, bar stays close.'),
  ('e0000000-0000-0000-0000-000000000003', 'Walking Lunge', 'strength', 'Long step, knee tracks over foot, drive through the heel.'),
  ('e0000000-0000-0000-0000-000000000004', 'Assault Bike', 'engine', 'Hold a pace you can repeat, not your max.'),
  ('e0000000-0000-0000-0000-000000000005', 'Ski Erg', 'engine', 'Drive from the lats, not the arms.'),
  ('e0000000-0000-0000-0000-000000000006', 'Row Erg', 'engine', 'Legs, hips, arms — reverse the sequence coming back.'),
  ('e0000000-0000-0000-0000-000000000007', 'Bench Press', 'strength', 'Full stop on the chest, drive feet into the floor.'),
  ('e0000000-0000-0000-0000-000000000008', 'Weighted Pull Up', 'strength', 'Full hang to chin over bar. No kipping.'),
  ('e0000000-0000-0000-0000-000000000009', 'DB Shoulder Press', 'strength', 'Ribs down, press straight overhead.'),
  ('e0000000-0000-0000-0000-000000000010', 'Barbell Row', 'strength', 'Flat back, pull to the lower chest.'),
  ('e0000000-0000-0000-0000-000000000011', 'Trap Bar Deadlift', 'strength', 'Push the floor away, chest stays proud.'),
  ('e0000000-0000-0000-0000-000000000012', 'Kettlebell Swing', 'conditioning', 'Hips snap, arms are just along for the ride.'),
  ('e0000000-0000-0000-0000-000000000013', 'Wall Ball', 'conditioning', 'Full squat depth, hit the target every rep.'),
  ('e0000000-0000-0000-0000-000000000014', 'Sled Push', 'conditioning', 'Low shin angle, short punchy steps.'),
  ('e0000000-0000-0000-0000-000000000015', 'Sandbag Lunge', 'hyrox', 'HYROX-pace lunges, bag stays tight to the chest.'),
  ('e0000000-0000-0000-0000-000000000016', 'Farmers Carry', 'hyrox', 'Ribs stacked over hips, grip is the limiter — own it.'),
  ('e0000000-0000-0000-0000-000000000017', 'Burpee Broad Jump', 'hyrox', 'Chest to floor, jump for distance not height.');

-- ─── Program: Week 1 and Week 2, Monday through Sunday ──────────────────
-- day_of_week: 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Sun

do $$
declare
  v_block_id uuid := '11111111-1111-1111-1111-111111111111';
  v_week int;
  v_workout_id uuid;
begin
  for v_week in 1..2 loop

    -- MONDAY — LOWER
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 1, 'lower', 'Lower Body — Strength')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000001', 1, 5, '5', '30X1', 150, case when v_week=1 then 'RPE 7' else 'RPE 8' end, 'Build to a heavy top set.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000002', 2, 4, '8', '31X1', 90, 'RPE 7', 'Control the eccentric.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000003', 3, 3, '10 each leg', null, 60, null, 'DB in goblet or rack position.');

    -- TUESDAY — ENGINE
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 2, 'engine', 'Engine — Zone 2 / Intervals')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000004', 1, 6, '30 sec on', 90, 'RPE 8', 'Hold wattage across all 6 rounds.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000005', 2, 4, '250m', 60, 'RPE 7', null);

    -- WEDNESDAY — UPPER
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 3, 'upper', 'Upper Body — Strength')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, tempo, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000007', 1, 5, '5', '30X1', 150, case when v_week=1 then 'RPE 7' else 'RPE 8' end, 'Build to a heavy top set.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000008', 2, 4, '6', null, 90, 'RPE 7', 'Add weight if bodyweight felt easy last time.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000009', 3, 3, '10', null, 75, null, null),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000010', 4, 3, '10', null, 60, null, null);

    -- THURSDAY — ENGINE
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 4, 'engine', 'Engine — Capacity')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000006', 1, 5, '500m', 120, 'RPE 8', 'Hold your Week 1 split or beat it.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000004', 2, 3, '2 min on', 120, 'RPE 7', null);

    -- FRIDAY — FULL BODY
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 5, 'full_body', 'Full Body — Strength Circuit')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000011', 1, 4, '5', 120, case when v_week=1 then 'RPE 7' else 'RPE 8' end, null),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000012', 2, 4, '15', 45, 'RPE 7', 'Heavy bell, snap the hips.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000013', 3, 4, '15', 45, 'RPE 7', null);

    -- SATURDAY — CONDITIONING
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 6, 'conditioning', 'Saturday Conditioning — Community')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000014', 1, 6, '20m', 60, 'Partner up. Push hard, recover fully.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000013', 2, 6, '15', 60, null);

    -- SUNDAY — HYROX
    insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
    values (v_block_id, v_week, 7, 'hyrox', 'HYROX Specific')
    returning id into v_workout_id;
    insert into public.workout_exercises (workout_id, exercise_id, order_index, sets, reps, rest_seconds, target_pct_or_rpe, coach_notes) values
      (v_workout_id, 'e0000000-0000-0000-0000-000000000015', 1, 4, '25m', 60, 'Race pace', null),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000016', 2, 4, '50m', 60, null, 'Grip is the limiter — own it.'),
      (v_workout_id, 'e0000000-0000-0000-0000-000000000017', 3, 3, '10', 60, null, null);

  end loop;
end $$;

-- Weeks 3-8: empty shells so the block structure exists end-to-end.
-- Program them in Supabase Studio or wait for the Program Builder (Phase 2).
do $$
declare
  v_block_id uuid := '11111111-1111-1111-1111-111111111111';
  v_week int;
  v_day int;
  v_type text;
  v_title text;
begin
  for v_week in 3..8 loop
    for v_day in 1..7 loop
      v_type := case v_day
        when 1 then 'lower' when 2 then 'engine' when 3 then 'upper'
        when 4 then 'engine' when 5 then 'full_body' when 6 then 'conditioning'
        else 'hyrox' end;
      v_title := case v_day
        when 1 then 'Lower Body' when 2 then 'Engine' when 3 then 'Upper Body'
        when 4 then 'Engine' when 5 then 'Full Body' when 6 then 'Saturday Conditioning'
        else 'HYROX Specific' end;
      insert into public.workouts (block_id, week_number, day_of_week, workout_type, title)
      values (v_block_id, v_week, v_day, v_type, v_title);
    end loop;
  end loop;
end $$;
