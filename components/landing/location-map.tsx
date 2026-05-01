import { createClient } from '@/lib/supabase/server'
import { MapPin } from 'lucide-react'
import type { Dict } from '@/lib/i18n/dictionaries'

const DEFAULT_ADDRESS = '5376 Fruitville Rd #28, Sarasota'

function isValidGoogleMapsEmbed(url: string): boolean {
  return url.startsWith('https://www.google.com/maps/embed') ||
    url.startsWith('https://maps.google.com/maps')
}

export async function LocationMap({ dict }: { dict: Dict }) {
  let address = DEFAULT_ADDRESS
  let mapEmbedUrl: string | null = null

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('barbershop_settings')
      .select('address, map_embed_url')
      .single()
    if (data) {
      address = data.address || DEFAULT_ADDRESS
      mapEmbedUrl = data.map_embed_url
    }
  } catch {
    // table not yet created — use default
  }

  const fallbackSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  const iframeSrc =
    mapEmbedUrl && isValidGoogleMapsEmbed(mapEmbedUrl)
      ? mapEmbedUrl
      : fallbackSrc

  return (
    <section id="location" className="py-24 bg-[#0a0a0a] border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl mb-5">
            <MapPin className="w-6 h-6 text-yellow-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{dict.locationTitle}</h2>
          <p className="text-gray-400 max-w-md text-sm leading-relaxed">{dict.locationSubtitle}</p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(234,179,8,0.05)]" style={{ height: 440 }}>
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={dict.locationTitle}
            sandbox="allow-scripts allow-same-origin"
            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5">
            <MapPin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-gray-300 text-sm">{address}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
