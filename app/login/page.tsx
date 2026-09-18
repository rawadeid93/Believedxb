'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      if (!data.session) {
        // Email confirmation is likely still on in the Supabase project.
        setError(
          'Account created. If you are not redirected, turn off "Confirm email" in Supabase Auth settings, then sign in below.'
        )
        setLoading(false)
        setMode('signin')
        return
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
    }

    router.replace('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-black px-6 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-white">BELIEVE</h1>
        <p className="mt-1 font-label text-xs uppercase tracking-[0.2em] text-white/50">
          Performance
        </p>
        <p className="mt-8 text-sm text-white/70">
          {mode === 'signin' ? 'Sign in to train.' : 'Create your account.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              className="tap-target w-full rounded-md border border-white/20 bg-transparent px-4 text-white placeholder-white/40 focus:border-white focus:outline-none"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            className="tap-target w-full rounded-md border border-white/20 bg-transparent px-4 text-white placeholder-white/40 focus:border-white focus:outline-none"
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="tap-target w-full rounded-md border border-white/20 bg-transparent px-4 text-white placeholder-white/40 focus:border-white focus:outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="tap-target mt-2 w-full rounded-md bg-white font-display font-semibold uppercase tracking-wider text-black disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          className="mt-6 w-full text-center text-sm text-white/50 underline underline-offset-4"
          onClick={() => {
            setError(null)
            setMode(mode === 'signin' ? 'signup' : 'signin')
          }}
        >
          {mode === 'signin' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}
