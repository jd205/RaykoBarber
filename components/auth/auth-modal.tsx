'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login, signup } from '@/app/actions/auth'
import { X } from 'lucide-react'
import type { Dict } from '@/lib/i18n/dictionaries'

export function AuthModal({ dict }: { dict: Dict }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('auth')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (mode !== 'login' && mode !== 'signup') return null

  const isLogin = mode === 'login'

  const closeModal = () => router.push(window.location.pathname)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = (isLogin ? await login(formData) : await signup(formData)) as { error?: string; success?: string } | undefined
      if (res?.error) setErrorMsg(res.error)
      if (res?.success) setSuccessMsg(res.success)
    } catch (e: unknown) {
      if ((e as { message?: string })?.message === 'NEXT_REDIRECT') throw e
      setErrorMsg('Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-sm w-full relative">
        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase text-sm">
            {isLogin ? dict.authSignIn : dict.authCreateAccount}
          </h2>
          <p className="text-sm text-gray-400">
            {isLogin ? dict.authAccessDashboard : dict.authJoinToday}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">{dict.authFullName}</label>
              <input
                name="full_name"
                type="text"
                required
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-400 mb-2">{dict.email}</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">{dict.authPassword}</label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">{errorMsg}</div>}
          {successMsg && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded-lg">{successMsg}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isLoading ? dict.authProcessing : (isLogin ? dict.authSignIn : dict.authCreateAccount)}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? dict.authNoAccount : dict.authHaveAccount}{' '}
          <button
            onClick={() => router.push(`?auth=${isLogin ? 'signup' : 'login'}`)}
            className="text-white hover:text-yellow-500 font-medium transition-colors"
          >
            {isLogin ? dict.authSignUpLink : dict.authLoginLink}
          </button>
        </div>
      </div>
    </div>
  )
}
