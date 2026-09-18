create or replace function public.get_leaderboard()
returns table (
    user_id uuid,
    full_name text,
    commitment_points int,
    streak_count int,
    workouts_completed bigint,
    rank bigint
  )
language sql
security definer
stable
as $$
  select
    m.user_id,
    m.full_name,
    m.commitment_points,
    m.streak_count,
    count(mw.id) filter (where mw.status = 'complete') as workouts_completed,
    rank() over (order by m.commitment_points desc) as rank
  from public.members m
  left join public.member_workouts mw on mw.member_id = m.user_id
  where m.active = true
  group by m.user_id, m.full_name, m.commitment_points, m.streak_count
  order by m.commitment_points desc;
$$;

grant execute on function public.get_leaderboard() to authenticated;
