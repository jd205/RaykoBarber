import { cookies } from 'next/headers'
import { dictionaries, type Locale } from '@/lib/i18n/dictionaries'
import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { Gallery } from '@/components/landing/gallery'
import { Features } from '@/components/landing/features'
import { LocationMap } from '@/components/landing/location-map'
import { ReviewsSection } from '@/components/landing/reviews-section'
import { SocialLinks } from '@/components/landing/social-links'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Reyko Nakao Barber',
  description: 'Premium grooming experience in Sarasota, FL. Precision cuts, hot towel shaves, and online booking.',
}

export default async function Home() {
  const locale = ((await cookies()).get('NEXT_LOCALE')?.value ?? 'en') as Locale
  const dict = dictionaries[locale] ?? dictionaries.en

  let heroImageUrl: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('barbershop_settings').select('hero_image_url').single()
    heroImageUrl = data?.hero_image_url ?? null
  } catch { /* table not ready — use fallback */ }

  return (
    <main className="min-h-screen bg-black">
      <Header dict={dict} currentLocale={locale} />
      <Hero dict={dict} heroImageUrl={heroImageUrl} />
      <Gallery dict={dict} />
      <Features dict={dict} />
      <ReviewsSection dict={dict} />
      <LocationMap dict={dict} />

      <footer className="bg-black py-12 border-t border-white/10 text-center text-gray-500">
        <div className="container mx-auto px-6">
          <SocialLinks />
          <p>© {new Date().getFullYear()} Reyko Nakao Barber. All rights reserved.</p>
          <p>©Dev by Jeffersson Medina.</p>
        </div>
      </footer>
    </main>
  )
}
