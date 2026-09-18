// Monday = 1 ... Sunday = 7, matching workouts.day_of_week in the schema.
export function isoDayOfWeek(date: Date): number {
  const jsDay = date.getDay() // 0 = Sunday ... 6 = Saturday
  return jsDay === 0 ? 7 : jsDay
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.floor((utcB - utcA) / msPerDay)
}

/** Which week of the block "today" falls in, clamped to [1, weeksTotal]. */
export function currentWeekNumber(startDate: string, weeksTotal: number, today = new Date()): number {
  const start = new Date(startDate + 'T00:00:00')
  const diff = daysBetween(start, today)
  const week = Math.floor(diff / 7) + 1
  return Math.min(Math.max(week, 1), weeksTotal)
}

export const DAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  lower: 'Lower',
  engine: 'Engine',
  upper: 'Upper',
  full_body: 'Full Body',
  conditioning: 'Conditioning',
  hyrox: 'HYROX',
}
