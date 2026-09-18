'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-display text-sm tracking-widest text-white/40">LOADING</p>
      </main>
    )
  }

  return <>{children}</>
}
