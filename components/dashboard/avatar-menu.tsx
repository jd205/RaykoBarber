'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  KeyRound, Loader2, CheckCircle2, ChevronDown,
  LogOut, X, Eye, EyeOff, ShieldCheck, AlertCircle,
} from 'lucide-react'
import { dictionaries } from '@/lib/i18n/dictionaries'

/* ─── Password strength helper ───────────────────────────── */
function getStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: '' }
  const hasUpper = /[A-Z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  const hasSpecial = /[^A-Za-z0-9]/.test(pw)
  const long = pw.length >= 8
  const score = [long, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' }
  if (score === 2) return { level: 2, label: 'Fair', color: 'bg-yellow-500' }
  return { level: 3, label: 'Strong', color: 'bg-green-500' }
}

/* ─── Change-password modal ───────────────────────────────── */
function ChangePasswordModal({
  email,
  dict,
  onClose,
}: {
  email: string
  dict: typeof dictionaries.en
  onClose: () => void
}) {
  const supabase = createClient()
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const strength = getStrength(next)
  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit = current.length > 0 && next.length >= 6 && next === confirm && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)

    // 1. Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signInErr) {
      setLoading(false)
      setError(dict.passCurrentIncorrect)
      return
    }

    // 2. Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: next })
    setLoading(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-white font-bold">{dict.changePass}</h3>
              <p className="text-gray-400 text-xs">{dict.passModalSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
            <p className="text-white font-bold">{dict.passUpdated}</p>
            <p className="text-gray-400 text-sm">{dict.passClosing}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Current password */}
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
                {dict.passCurrentPwd}
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
                {dict.passNewPwd}
              </label>
              <div className="relative">
                <input
                  type={showNext ? 'text' : 'password'}
                  value={next}
                  onChange={e => setNext(e.target.value)}
                  placeholder={dict.passMinChars}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNext(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {next.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(l => (
                      <div
                        key={l}
                        className={`h-1 flex-1 rounded-full transition-all ${strength.level >= l ? strength.color : 'bg-white/10'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.level === 1 ? 'text-red-400' :
                    strength.level === 2 ? 'text-yellow-400' : 'text-green-400'
                  }`}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
                {dict.passConfirmNew}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={dict.passRepeatNew}
                  className={`w-full bg-black border rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none transition-colors placeholder:text-gray-600
                    ${mismatch ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-yellow-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {dict.passMismatch}
                </p>
              )}
              {!mismatch && confirm.length > 0 && next === confirm && (
                <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {dict.passMatch}
                </p>
              )}
            </div>

            {/* Server error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
              >
                {dict.cancel}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {dict.updatePass}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */
type Props = {
  userId: string
  fullName: string
  email: string
  currentAvatarUrl?: string | null
  dict: typeof dictionaries.en
}

export function AvatarMenu({ userId, fullName, email, currentAvatarUrl, dict }: Props) {
  const [open, setOpen]           = useState(false)
  const [showPassModal, setShowPassModal] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const defaultAvatar = fullName
    ? `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=000000`
    : `https://api.dicebear.com/9.x/micah/svg?seed=${userId}&backgroundColor=000000`

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openMenu     = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setOpen(true) }
  const scheduleClose = () => { hoverTimer.current = setTimeout(() => setOpen(false), 180) }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      <div
        ref={ref}
        className="relative"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        {/* Trigger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 focus:outline-none group"
          aria-label="User menu"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black border-2 border-yellow-500 overflow-hidden flex-shrink-0 shadow-lg transition-all group-hover:border-yellow-400">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentAvatarUrl || defaultAvatar} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            className="absolute right-0 top-full mt-2 w-68 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[240px]"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-white font-bold text-sm truncate">{fullName}</p>
              <p className="text-gray-400 text-xs truncate">{email}</p>
            </div>

            {/* Change password — opens modal */}
            <button
              onClick={() => { setOpen(false); setShowPassModal(true) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <KeyRound className="w-4 h-4 text-yellow-500" />
              {dict.changePass}
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {dict.signOut}
            </button>
          </div>
        )}
      </div>

      {/* Change password modal — rendered outside the dropdown flow */}
      {showPassModal && (
        <ChangePasswordModal
          email={email}
          dict={dict}
          onClose={() => setShowPassModal(false)}
        />
      )}
    </>
  )
}
