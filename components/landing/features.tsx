'use client'

import { motion } from 'framer-motion'
import { Clock, Shield, Sparkles, UserCheck } from 'lucide-react'
import type { Dict } from '@/lib/i18n/dictionaries'

export function Features({ dict }: { dict: Dict }) {
  const features = [
    { icon: <Clock className="w-8 h-8 text-yellow-500" />,    title: dict.feat1Title, description: dict.feat1Desc },
    { icon: <UserCheck className="w-8 h-8 text-yellow-500" />, title: dict.feat2Title, description: dict.feat2Desc },
    { icon: <Sparkles className="w-8 h-8 text-yellow-500" />,  title: dict.feat3Title, description: dict.feat3Desc },
    { icon: <Shield className="w-8 h-8 text-yellow-500" />,    title: dict.feat4Title, description: dict.feat4Desc },
  ]

  return (
    <section className="py-24 bg-black text-white relative border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-colors"
            >
              <div className="bg-black p-4 inline-block rounded-xl border border-white/10 mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
