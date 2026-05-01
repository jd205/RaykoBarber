import { createClient } from '@/lib/supabase/server'
import { Star, ExternalLink } from 'lucide-react'
import type { Review } from '@/app/actions/settings'
import type { Dict } from '@/lib/i18n/dictionaries'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700 fill-gray-700'}`} />
      ))}
    </div>
  )
}

function ReviewCard({ review, googleLabel }: { review: Review; googleLabel: string }) {
  const initials = review.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex-shrink-0 w-[300px] mx-3 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:border-yellow-500/20 transition-colors">
      <StarRating rating={review.rating} />
      <p className="text-gray-300 text-sm leading-relaxed flex-1 line-clamp-5">&ldquo;{review.text}&rdquo;</p>
      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        {review.author_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review.author_photo_url} alt={review.author_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-500 font-bold text-xs flex-shrink-0">
            {initials}
          </div>
        )}
        <div>
          <p className="text-white font-semibold text-sm leading-none">{review.author_name}</p>
          <p className="text-gray-600 text-xs mt-1">{googleLabel}</p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-5 h-5 opacity-60">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.1 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
            <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.7 37 27 38 24 38c-5.9 0-10.9-4-12.7-9.5l-7 5.4C7.8 41.8 15.3 46 24 46z"/>
            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.7-4.9 6.1l6.7 5.5C41.7 36.5 46 31 46 24c0-1.3-.2-2.7-.5-4z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

export async function ReviewsSection({ dict }: { dict: Dict }) {
  let reviews: Review[] = []
  let googleMapsUrl: string | null = null

  try {
    const supabase = await createClient()
    const [reviewsRes, settingsRes] = await Promise.all([
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('barbershop_settings').select('google_maps_url').single(),
    ])
    reviews = (reviewsRes.data as Review[]) ?? []
    googleMapsUrl = settingsRes.data?.google_maps_url ?? null
  } catch {
    // tables not ready — skip section
  }

  if (reviews.length === 0 && !googleMapsUrl) return null

  const doubled = [...reviews, ...reviews]
  const speed = Math.max(25, reviews.length * 7)

  return (
    <section className="py-20 bg-black border-t border-white/5 overflow-hidden">
      <div className="container mx-auto px-6 mb-12">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">{dict.reviewsTitle}</h2>
          <p className="text-gray-500 text-sm max-w-sm">{dict.reviewsSubtitle}</p>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee" style={{ width: 'max-content', animationDuration: `${speed}s` }}>
            {doubled.map((review, i) => (
              <ReviewCard key={`${review.id}-${i}`} review={review} googleLabel={dict.reviewsGoogleLabel} />
            ))}
          </div>
        </div>
      )}

      {googleMapsUrl && (
        <div className="container mx-auto px-6 mt-12 flex justify-center">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-[#111] hover:bg-white/5 border border-white/10 hover:border-yellow-500/40 rounded-2xl px-8 py-5 transition-all shadow-lg hover:shadow-[0_0_30px_rgba(234,179,8,0.12)]"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">
              <svg viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.1 19.3 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                <path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.7 37 27 38 24 38c-5.9 0-10.9-4-12.7-9.5l-7 5.4C7.8 41.8 15.3 46 24 46z"/>
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.7-4.9 6.1l6.7 5.5C41.7 36.5 46 31 46 24c0-1.3-.2-2.7-.5-4z"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-base group-hover:text-yellow-400 transition-colors">{dict.reviewsViewAll}</p>
              <p className="text-gray-500 text-sm">{dict.reviewsViewAllSub}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-yellow-500 transition-colors ml-2 flex-shrink-0" />
          </a>
        </div>
      )}
    </section>
  )
}
