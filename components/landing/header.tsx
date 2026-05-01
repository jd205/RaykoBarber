'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scissors } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Dict, Locale } from '@/lib/i18n/dictionaries'

export function Header({ dict, currentLocale }: { dict: Dict; currentLocale: Locale }) {
  const [scrolled, setScrolled] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null)

  const changeLanguage = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
    window.location.reload()
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    const supabase = createClient()

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', userId).single()
      if (data) setProfile(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const defaultAvatar = profile?.full_name
    ? `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(profile.full_name)}&backgroundColor=000000`
    : `https://api.dicebear.com/9.x/micah/svg?seed=Guest&backgroundColor=000000`

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-black/60 backdrop-blur-md border-b border-white/10' : 'bg-transparent text-white'
    }`}>
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Scissors className="w-5 h-5 text-yellow-500 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-bold tracking-widest uppercase text-white">Reyko Nakao</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: dict.navServices,  href: '#services'  },
            { label: dict.navGallery,   href: '#gallery'   },
            { label: dict.navBarbers,   href: '#barbers'   },
            { label: dict.navFindUs,    href: '#location'  },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="relative group hidden sm:block">
              <div className="flex items-center gap-3 cursor-pointer py-2">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors">
                    {profile?.full_name || dict.client}
                  </span>
                </div>
                <div className="relative w-10 h-10 rounded-full border-2 border-yellow-500/50 group-hover:border-yellow-500 transition-colors bg-black flex items-center justify-center overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile?.avatar_url || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 overflow-hidden flex flex-col z-50">
                <Link href="/dashboard" className="px-5 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5">
                  {dict.navDashboard}
                </Link>
                <button onClick={handleSignOut} className="w-full text-left px-5 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
                  {dict.signOut}
                </button>
              </div>
            </div>
          ) : (
            <Link href="?auth=login" className="text-sm font-medium hover:text-yellow-500 transition-colors hidden sm:block text-gray-300">
              {dict.navClientLogin}
            </Link>
          )}

          <Link
            href="/booking"
            className="text-sm font-medium bg-white text-black px-5 py-2.5 rounded-full hover:bg-yellow-500 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]"
          >
            {dict.navBookNow}
          </Link>

          {/* Language toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
            {(['en', 'es'] as Locale[]).map(loc => (
              <button
                key={loc}
                onClick={() => changeLanguage(loc)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  currentLocale === loc
                    ? 'bg-yellow-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
