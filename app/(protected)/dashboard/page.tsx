'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers'
import { currentWeekNumber, isoDayOfWeek, WORKOUT_TYPE_LABELS } from '@/lib/schedule'
import type { TrainingBlock, Workout } from '@/types/database'

interface DashboardData {
  fullName: string
  streak: number
  points: number
  weekNumber: number
  weeksTotal: number
  completionPct: number
  todayWorkout: Workout | null
  todayStatus: 'not_started' | 'in_progress' | 'complete' | 'none'
}

export default function DashboardPage() {
  const { session } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    async function load() {
      const userId = session!.user.id

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('full_name, streak_count, commitment_points, current_block_id')
        .eq('user_id', userId)
        .single()

      if (memberError || !member) {
        setError(memberError?.message ?? 'No member profile found.')
        return
      }

      if (!member.current_block_id) {
        setError('You are not enrolled in a training block yet. Ask your coach to assign one.')
        return
      }

      const { data: block, error: blockError } = await supabase
        .from('training_blocks')
        .select('*')
        .eq('id', member.current_block_id)
        .single<TrainingBlock>()

      if (blockError || !block) {
        setError(blockError?.message ?? 'Training block not found.')
        return
      }

      const week = currentWeekNumber(block.start_date, block.weeks_total)
      const today = isoDayOfWeek(new Date())

      const { data: todayWorkout } = await supabase
        .from('workouts')
        .select('*')
        .eq('block_id', block.id)
        .eq('week_number', week)
        .eq('day_of_week', today)
        .maybeSingle<Workout>()

      let todayStatus: DashboardData['todayStatus'] = 'none'
      if (todayWorkout) {
        const { data: mw } = await supabase
          .from('member_workouts')
          .select('status')
          .eq('member_id', userId)
          .eq('workout_id', todayWorkout.id)
          .maybeSingle()
        todayStatus = (mw?.status as DashboardData['todayStatus']) ?? 'not_started'
      }

      const { data: scheduled } = await supabase
        .from('workouts')
        .select('id')
        .eq('block_id', block.id)
        .lte('week_number', week)

      const scheduledIds = (scheduled ?? []).map((w) => w.id)
      let completionPct = 0
      if (scheduledIds.length > 0) {
        const { count } = await supabase
          .from('member_workouts')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', userId)
          .eq('status', 'complete')
          .in('workout_id', scheduledIds)
        completionPct = Math.round(((count ?? 0) / scheduledIds.length) * 100)
      }

      if (cancelled) return
      setData({
        fullName: member.full_name,
        streak: member.streak_count ?? 0,
        points: member.commitment_points ?? 0,
        weekNumber: week,
        weeksTotal: block.weeks_total,
        completionPct,
        todayWorkout: todayWorkout ?? null,
        todayStatus,
      })
    }

    load().catch((e) => setError(e.message))
    return () => {
      cancelled = true
    }
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-white/70">{error}</p>
        <button onClick={signOut} className="text-sm text-white/40 underline">
          Sign out
        </button>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-display text-sm tracking-widest text-white/40">LOADING</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-5 pb-16 safe-top safe-bottom">
      <header className="flex items-center justify-between py-6">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-white/50">Believe</p>
          <h1 className="font-display text-xl font-semibold text-white">{data.fullName}</h1>
        </div>
        <button onClick={signOut} className="text-xs text-white/40 underline">
          Sign out
        </button>
      </header>

      <Link
        href="/leaderboard"
        className="tap-target mb-4 flex items-center justify-between rounded-xl border border-white/15 px-4"
      >
        <span className="font-label text-xs uppercase tracking-[0.15em] text-white/60">
          Leaderboard
        </span>
        <span className="text-white/40">-&gt;</span>
      </Link>

      <section className="rounded-2xl border border-white/15 p-5">
        <p className="font-label text-xs uppercase tracking-[0.2em] text-white/50">
          Week {data.weekNumber} of {data.weeksTotal}
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min(data.completionPct, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-white/60">{data.completionPct}% of block complete</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/15 p-5">
          <p className="font-display text-3xl font-bold text-white">{data.streak}</p>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-white/50">
            Day streak
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 p-5">
          <p className="font-display text-3xl font-bold text-white">{data.points}</p>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-white/50">
            Commitment pts
          </p>
        </div>
      </section>

      <section className="mt-6">
        <p className="font-label text-xs uppercase tracking-[0.2em] text-white/50">
          Today's Workout
        </p>
        {data.todayWorkout ? (
          <Link
            href={`/workout/${data.todayWorkout.id}`}
            className="tap-target mt-3 flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-5 py-6"
          >
            <div>
              <p className="font-display text-lg font-semibold text-white">
                {data.todayWorkout.title}
              </p>
              <p className="text-sm text-white/50">
                {WORKOUT_TYPE_LABELS[data.todayWorkout.workout_type] ?? data.todayWorkout.workout_type}
              </p>
            </div>
            <span className="font-display text-sm font-semibold uppercase text-white">
              {data.todayStatus === 'complete' ? 'Complete' : 'Start'}
            </span>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-white/50">No workout scheduled today. Recover well.</p>
        )}
      </section>
    </main>
  )
}
