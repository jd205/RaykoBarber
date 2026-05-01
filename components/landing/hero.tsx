'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import type { Dict } from '@/lib/i18n/dictionaries'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2674&auto=format&fit=crop'

export function Hero({ dict, heroImageUrl }: { dict: Dict; heroImageUrl?: string | null }) {
  const bgImage = heroImageUrl || FALLBACK_IMAGE
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white pt-20">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-yellow-500 uppercase tracking-[0.3em] text-sm mb-6 font-semibold">
            {dict.heroTagline}
          </p>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            {dict.heroTitle1} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              {dict.heroTitle2}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
            {dict.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-yellow-500 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-colors w-full sm:w-auto justify-center"
              >
                <Calendar className="w-5 h-5" />
                {dict.heroCTA}
              </motion.button>
            </Link>
            <Link href="?auth=login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-transparent text-white border border-white/20 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
              >
                {dict.heroLogin}
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-10" />
    </section>
  )
}
