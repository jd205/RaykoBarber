import { cookies } from 'next/headers'
import { dictionaries, type Locale } from '@/lib/i18n/dictionaries'
import { BookingCalendar } from '@/components/booking/booking-calendar'
import Link from 'next/link'
import { Scissors } from 'lucide-react'

export const metadata = {
  title: 'Book Appointment | The Noble',
}

export default async function BookingPage() {
  const locale = ((await cookies()).get('NEXT_LOCALE')?.value ?? 'en') as Locale
  const dict = dictionaries[locale] ?? dictionaries.en

  return (
    <div className="min-h-screen bg-black bg-[url('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-fixed flex flex-col">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-0" />
      <header className="relative z-10 p-6 flex justify-center border-b border-white/5 bg-black/50">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Scissors className="w-6 h-6 text-yellow-500" />
          <span className="font-bold text-xl tracking-widest uppercase">The Noble</span>
        </Link>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <BookingCalendar dict={dict} />
      </main>
    </div>
  )
}
