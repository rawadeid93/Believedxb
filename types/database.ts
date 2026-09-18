export type WorkoutType =
  | 'lower'
  | 'engine'
  | 'upper'
  | 'full_body'
  | 'conditioning'
  | 'hyrox'

export type MemberWorkoutStatus = 'not_started' | 'in_progress' | 'complete'

export interface Member {
  user_id: string
  full_name: string
  join_date: string
  active: boolean
  current_block_id: string | null
  streak_count: number
  commitment_points: number
  last_workout_date: string | null
}

export interface TrainingBlock {
  id: string
  name: string
  start_date: string
  weeks_total: number
  active: boolean
}

export interface Workout {
  id: string
  block_id: string
  week_number: number
  day_of_week: number // 1 = Monday ... 7 = Sunday
  workout_type: WorkoutType
  title: string
}

export interface Exercise {
  id: string
  name: string
  category: string | null
  video_url: string | null
  instructions: string | null
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_id: string
  order_index: number
  sets: number | null
  reps: string | null
  tempo: string | null
  rest_seconds: number | null
  target_pct_or_rpe: string | null
  coach_notes: string | null
  exercise?: Exercise
}

export interface MemberWorkout {
  id: string
  member_id: string
  workout_id: string
  status: MemberWorkoutStatus
  completed_at: string | null
}

export interface ExerciseLog {
  id: string
  member_workout_id: string
  workout_exercise_id: string
  weight_kg: number | null
  reps: number | null
  time_seconds: number | null
  distance_m: number | null
  calories: number | null
  rpe: number | null
  notes: string | null
  logged_at: string
}
