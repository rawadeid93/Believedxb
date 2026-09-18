'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers'
import { WORKOUT_TYPE_LABELS } from '@/lib/schedule'
import type { Workout, WorkoutExercise, ExerciseLog } from '@/types/database'

interface ExerciseRow extends WorkoutExercise {
  exercise: {
    id: string
    name: string
    category: string | null
    video_url: string | null
    instructions: string | null
  }
}

interface LogState {
  weight_kg: string
  reps: string
  time_seconds: string
  distance_m: string
  calories: string
  rpe: string
  notes: string
  saved: boolean
  saving: boolean
}

const emptyLog: LogState = {
  weight_kg: '',
  reps: '',
  time_seconds: '',
  distance_m: '',
  calories: '',
  rpe: '',
  notes: '',
  saved: false,
  saving: false,
}

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()

  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<ExerciseRow[]>([])
  const [logs, setLogs] = useState<Record<string, LogState>>({})
  const [lastWeek, setLastWeek] = useState<Record<string, ExerciseLog | undefined>>({})
  const [memberWorkoutId, setMemberWorkoutId] = useState<string | null>(null)
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'complete'>('not_started')
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completionResult, setCompletionResult] = useState<{
    streak: number
    points: number
    pointsEarned: number
  } | null>(null)

  useEffect(() => {
    if (!session || !id) return
    let cancelled = false

    async function load() {
      const userId = session!.user.id

      const { data: w, error: wErr } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single<Workout>()
      if (wErr || !w) {
        setError(wErr?.message ?? 'Workout not found.')
        return
      }

      const { data: we, error: weErr } = await supabase
        .from('workout_exercises')
        .select('*, exercise:exercises(*)')
        .eq('workout_id', id)
        .order('order_index', { ascending: true })
      if (weErr) {
        setError(weErr.message)
        return
      }

      // Get or create this member's workout instance for today.
      let { data: mw } = await supabase
        .from('member_workouts')
        .select('*')
        .eq('member_id', userId)
        .eq('workout_id', id)
        .maybeSingle()

      if (!mw) {
        const { data: created, error: createErr } = await supabase
          .from('member_workouts')
          .insert({ member_id: userId, workout_id: id, status: 'not_started' })
          .select()
          .single()
        if (createErr) {
          setError(createErr.message)
          return
        }
        mw = created
      }

      const exerciseIds = (we ?? []).map((row: any) => row.exercise_id)

      // Existing logs for THIS member_workout (resume in-progress logging).
      const { data: existingLogs } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('member_workout_id', mw!.id)

      // Most recent previous log per exercise, across all this member's history.
      const { data: priorLogs } = await supabase
        .from('exercise_logs')
        .select('*, workout_exercises!inner(exercise_id), member_workouts!inner(member_id)')
        .eq('member_workouts.member_id', userId)
        .in('workout_exercises.exercise_id', exerciseIds)
        .neq('member_workout_id', mw!.id)
        .order('logged_at', { ascending: false })

      const lastWeekMap: Record<string, ExerciseLog> = {}
      for (const row of (priorLogs ?? []) as any[]) {
        const exId = row.workout_exercises.exercise_id
        if (!lastWeekMap[exId]) lastWeekMap[exId] = row
      }

      const initialLogs: Record<string, LogState> = {}
      for (const row of (we ?? []) as ExerciseRow[]) {
        const existing = (existingLogs ?? []).find(
          (l: any) => l.workout_exercise_id === row.id
        )
        initialLogs[row.id] = existing
          ? {
              weight_kg: existing.weight_kg?.toString() ?? '',
              reps: existing.reps?.toString() ?? '',
              time_seconds: existing.time_seconds?.toString() ?? '',
              distance_m: existing.distance_m?.toString() ?? '',
              calories: existing.calories?.toString() ?? '',
              rpe: existing.rpe?.toString() ?? '',
              notes: existing.notes ?? '',
              saved: true,
              saving: false,
            }
          : { ...emptyLog }
      }

      if (cancelled) return
      setWorkout(w)
      setExercises((we ?? []) as ExerciseRow[])
      setLogs(initialLogs)
      const lastWeekByExerciseId: Record<string, ExerciseLog | undefined> = {}
      for (const row of (we ?? []) as ExerciseRow[]) {
        lastWeekByExerciseId[row.id] = lastWeekMap[row.exercise_id]
      }
      setLastWeek(lastWeekByExerciseId)
      setMemberWorkoutId(mw!.id)
      setStatus(mw!.status)
    }

    load().catch((e) => setError(e.message))
    return () => {
      cancelled = true
    }
  }, [session, id])

  const updateField = (workoutExerciseId: string, field: keyof LogState, value: string) => {
    setLogs((prev) => ({
      ...prev,
      [workoutExerciseId]: { ...prev[workoutExerciseId], [field]: value, saved: false },
    }))
  }

  const saveExercise = useCallback(
    async (workoutExerciseId: string) => {
      if (!memberWorkoutId) return
      const log = logs[workoutExerciseId]
      if (!log) return

      setLogs((prev) => ({
        ...prev,
        [workoutExerciseId]: { ...prev[workoutExerciseId], saving: true },
      }))

      const payload = {
        member_workout_id: memberWorkoutId,
        workout_exercise_id: workoutExerciseId,
        weight_kg: log.weight_kg ? Number(log.weight_kg) : null,
        reps: log.reps ? Number(log.reps) : null,
        time_seconds: log.time_seconds ? Number(log.time_seconds) : null,
        distance_m: log.distance_m ? Number(log.distance_m) : null,
        calories: log.calories ? Number(log.calories) : null,
        rpe: log.rpe ? Number(log.rpe) : null,
        notes: log.notes || null,
        logged_at: new Date().toISOString(),
      }

      const { error: upsertErr } = await supabase
        .from('exercise_logs')
        .upsert(payload, { onConflict: 'member_workout_id,workout_exercise_id' })

      setLogs((prev) => ({
        ...prev,
        [workoutExerciseId]: { ...prev[workoutExerciseId], saving: false, saved: !upsertErr },
      }))

      if (!upsertErr && status === 'not_started') {
        await supabase
          .from('member_workouts')
          .update({ status: 'in_progress' })
          .eq('id', memberWorkoutId)
        setStatus('in_progress')
      }
    },
    [logs, memberWorkoutId, status]
  )

  async function completeWorkout() {
    if (!memberWorkoutId) return
    setCompleting(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('complete_workout', {
      p_member_workout_id: memberWorkoutId,
    })
    setCompleting(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    setStatus('complete')
    setCompletionResult({
      streak: data.streak_count,
      points: data.commitment_points,
      pointsEarned: data.points_earned,
    })
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-white/70">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/40 underline">
          Back to dashboard
        </button>
      </main>
    )
  }

  if (completionResult) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center safe-top safe-bottom">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-white/50">
          Workout Complete
        </p>
        <h1 className="font-display text-3xl font-bold text-white">Strength starts from within.</h1>
        <div className="flex gap-8">
          <div>
            <p className="font-display text-4xl font-bold text-white">{completionResult.streak}</p>
            <p className="font-label text-xs uppercase text-white/50">Day streak</p>
          </div>
          <div>
            <p className="font-display text-4xl font-bold text-white">
              +{completionResult.pointsEarned}
            </p>
            <p className="font-label text-xs uppercase text-white/50">Points earned</p>
          </div>
        </div>
        <p className="text-sm text-white/60">{completionResult.points} total commitment points</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="tap-target mt-4 w-full max-w-xs rounded-md bg-white font-display font-semibold uppercase tracking-wider text-black"
        >
          Back to Dashboard
        </button>
      </main>
    )
  }

  if (!workout) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-display text-sm tracking-widest text-white/40">LOADING</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-5 pb-28 safe-top">
      <header className="py-6">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-white/40">
          ← Dashboard
        </button>
        <p className="mt-3 font-label text-xs uppercase tracking-[0.2em] text-white/50">
          {WORKOUT_TYPE_LABELS[workout.workout_type] ?? workout.workout_type}
        </p>
        <h1 className="font-display text-2xl font-bold text-white">{workout.title}</h1>
      </header>

      <div className="flex flex-col gap-4">
        {exercises.map((row, idx) => {
          const log = logs[row.id] ?? emptyLog
          const last = lastWeek[row.id]
          const isEngine = row.exercise.category === 'engine' || row.exercise.category === 'conditioning'

          return (
            <div key={row.id} className="rounded-2xl border border-white/15 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-label text-xs uppercase text-white/40">
                    {idx + 1}. {row.exercise.category ?? ''}
                  </p>
                  <p className="font-display text-lg font-semibold text-white">
                    {row.exercise.name}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {row.sets ? `${row.sets} sets` : ''}
                    {row.reps ? ` × ${row.reps}` : ''}
                    {row.tempo ? ` · Tempo ${row.tempo}` : ''}
                    {row.rest_seconds ? ` · Rest ${row.rest_seconds}s` : ''}
                  </p>
                  {row.target_pct_or_rpe && (
                    <p className="text-sm text-white/40">Target: {row.target_pct_or_rpe}</p>
                  )}
                  {row.coach_notes && (
                    <p className="mt-1 text-sm italic text-white/50">{row.coach_notes}</p>
                  )}
                </div>
                {log.saved && <span className="text-xs text-white/40">Saved ✓</span>}
              </div>

              {last && (
                <p className="mt-3 rounded-md bg-white/5 px-3 py-2 text-sm text-white/60">
                  Last week: {last.weight_kg ? `${last.weight_kg} kg` : ''}
                  {last.reps ? ` × ${last.reps}` : ''}
                  {last.time_seconds ? ` · ${last.time_seconds}s` : ''}
                  {last.distance_m ? ` · ${last.distance_m}m` : ''}
                  {last.rpe ? ` · RPE ${last.rpe}` : ''}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {!isEngine && (
                  <>
                    <input
                      className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                      placeholder="Weight (kg)"
                      inputMode="decimal"
                      value={log.weight_kg}
                      onChange={(e) => updateField(row.id, 'weight_kg', e.target.value)}
                      onBlur={() => saveExercise(row.id)}
                    />
                    <input
                      className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                      placeholder="Reps"
                      inputMode="numeric"
                      value={log.reps}
                      onChange={(e) => updateField(row.id, 'reps', e.target.value)}
                      onBlur={() => saveExercise(row.id)}
                    />
                  </>
                )}
                {isEngine && (
                  <>
                    <input
                      className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                      placeholder="Time (sec)"
                      inputMode="numeric"
                      value={log.time_seconds}
                      onChange={(e) => updateField(row.id, 'time_seconds', e.target.value)}
                      onBlur={() => saveExercise(row.id)}
                    />
                    <input
                      className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                      placeholder="Distance (m)"
                      inputMode="numeric"
                      value={log.distance_m}
                      onChange={(e) => updateField(row.id, 'distance_m', e.target.value)}
                      onBlur={() => saveExercise(row.id)}
                    />
                  </>
                )}
                <input
                  className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                  placeholder="RPE (1-10)"
                  inputMode="numeric"
                  value={log.rpe}
                  onChange={(e) => updateField(row.id, 'rpe', e.target.value)}
                  onBlur={() => saveExercise(row.id)}
                />
                <input
                  className="tap-target rounded-md border border-white/20 bg-transparent px-3 text-white placeholder-white/40 focus:border-white focus:outline-none"
                  placeholder="Notes"
                  value={log.notes}
                  onChange={(e) => updateField(row.id, 'notes', e.target.value)}
                  onBlur={() => saveExercise(row.id)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {status !== 'complete' && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/15 bg-black p-4 safe-bottom">
          <button
            onClick={completeWorkout}
            disabled={completing}
            className="tap-target w-full rounded-md bg-white font-display text-base font-semibold uppercase tracking-wider text-black disabled:opacity-50"
          >
            {completing ? 'Saving...' : 'Complete Workout'}
          </button>
        </div>
      )}
    </main>
  )
}
