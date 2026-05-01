'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { dictionaries, Locale } from '@/lib/i18n/dictionaries'
import { Globe } from 'lucide-react'

export function Settings({ dict, currentLocale }: { dict: typeof dictionaries.en, currentLocale: Locale }) {
  const [password, setPassword] = useState('')
  const router = useRouter()

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = e.target.value
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`
    router.refresh() // Reload page to fetch new dict on server
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mt-8">
      <div>
        <h2 className="text-sm tracking-widest uppercase font-bold mb-6 text-yellow-500">{dict.security}</h2>
        <form action="/dashboard" className="max-w-md">
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">{dict.changePass}</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button className="bg-white/10 text-white font-semibold px-6 py-2 rounded-lg hover:bg-white/20 transition-colors text-sm">
            {dict.updatePass}
          </button>
        </form>
      </div>
    </div>
  )
}
