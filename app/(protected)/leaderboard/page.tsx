'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/app/providers'
interface LeaderboardRow {
user_id: string
full_name: string
commitment_points: number
streak_count: number
workouts_completed: number
rank: number
}
export default function LeaderboardPage() {
const { session } = useAuth()
const [rows, setRows] = useState<LeaderboardRow[]>([])
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(true)
useEffect(() => {
if (!session) return
supabase.rpc('get_leaderboard').then(({ data, error: rpcError }) => {
if (rpcError) {
setError(rpcError.message)
} else {
setRows((data ?? []) as LeaderboardRow[])
}
setLoading(false)
})
}, [session])
const you = session?.user.id
return (
<main className="min-h-screen bg-black px-5 pb-16 safe-top safe-bottom">
<header className="py-6">
<Link href="/dashboard" className="text-sm text-white/40">Back to Dashboard</Link>
<p className="mt-3 font-label text-xs uppercase tracking-[0.2em] text-white/50">Believe</p>
<h1 className="font-display text-2xl font-bold text-white">Commitment Leaderboard</h1>
<p className="mt-1 text-sm text-white/50">Ranked by showing up, not by how much you lift.</p>
</header>
{error && <p className="text-sm text-red-400">{error}</p>}
{loading && <p className="font-display text-sm tracking-widest text-white/40">LOADING</p>}
<div className="flex flex-col gap-2">
{rows.map((row) => {
const isYou = row.user_id === you
return (
<div key={row.user_id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isYou ? 'border-white bg-white/10' : 'border-white/15'}`}>
<div className="flex items-center gap-3">
<span className="w-6 font-display text-lg font-bold text-white">{row.rank}</span>
<div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-display text-sm text-white">{row.full_name?.charAt(0)?.toUpperCase() ?? '?'}</div>
<div>
<p className="font-display text-sm font-semibold text-white">{row.full_name} {isYou && <span className="text-white/40">(You)</span>}</p>
<p className="text-xs text-white/50">{row.workouts_completed} workouts, {row.streak_count} day streak</p>
</div>
</div>
<p className="font-display text-lg font-bold text-white">{row.commitment_points}</p>
</div>
)
})}
</div>
</main>
)
}
