'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './providers'

export default function RootPage() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(session ? '/dashboard' : '/login')
  }, [loading, session, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <p className="font-display text-sm tracking-widest text-white/60">BELIEVE</p>
    </main>
  )
}
