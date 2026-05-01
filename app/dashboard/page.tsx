import { UpcomingAppointments } from '@/components/dashboard/upcoming'
import { HaircutHistory } from '@/components/dashboard/history'
import { AdminDashboard } from '@/components/dashboard/admin'
import { AvatarMenu } from '@/components/dashboard/avatar-menu'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { cookies } from 'next/headers'
import { dictionaries, Locale } from '@/lib/i18n/dictionaries'

export const metadata = {
  title: 'Dashboard | Reyko Nakao Barber',
}

export type Appointment = {
  id: string
  user_id: string
  service_id: string
  barber_id: string
  appointment_date: string
  status: string
  notes: string | null
  attended: boolean | null
  created_at: string
}

export type AdminAppointment = Appointment & {
  profiles: { full_name: string | null; email: string | null } | null
}

export type CatalogMaps = {
  servicesMap: Record<string, string>
  barbersMap: Record<string, string>
  pricesMap: Record<string, string>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/?auth=login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'client'
  const fullName = profile?.full_name || 'Client'

  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as Locale
  const dict = dictionaries[locale] || dictionaries.en

  /* ── Build catalog lookup maps ─────────────────────────── */
  const [{ data: servicesData }, { data: barbersData }] = await Promise.all([
    supabase.from('services').select('id, name, price').order('sort_order'),
    supabase.from('barbers').select('id, name').order('sort_order'),
  ])

  // Start with legacy string-ID fallbacks so old appointments still display
  const catalog: CatalogMaps = {
    servicesMap: { '1': 'Premium Haircut', '2': 'Hair & Beard Trim', '3': 'Hot Towel Shave' },
    barbersMap:  { '1': 'James "The Blade"', '2': 'Marcus Black' },
    pricesMap:   { '1': '$45.00', '2': '$65.00', '3': '$40.00' },
  }
  servicesData?.forEach(s => {
    catalog.servicesMap[s.id] = s.name
    catalog.pricesMap[s.id] = `$${Number(s.price).toFixed(2)}`
  })
  barbersData?.forEach(b => { catalog.barbersMap[b.id] = b.name })

  /* ── Appointments ──────────────────────────────────────── */
  let clientAppointments: Appointment[] = []
  let adminAppointments: AdminAppointment[] = []

  if (role === 'admin') {
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(full_name, email)')
      .order('appointment_date', { ascending: false })
    adminAppointments = (data as AdminAppointment[]) || []
  } else {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('appointment_date', { ascending: false })
    clientAppointments = (data as Appointment[]) || []
  }

  const upcoming = clientAppointments.filter(
    a => a.status === 'scheduled' && new Date(a.appointment_date) >= new Date()
  )
  const history = clientAppointments.filter(
    a => a.status !== 'scheduled' || new Date(a.appointment_date) < new Date()
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-[#111] sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-yellow-500" />
            <span className="font-bold tracking-widest uppercase hidden sm:block">Reyko Nakao</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-col text-right hidden sm:flex">
              <span className="text-sm font-bold text-white">{fullName}</span>
              <span className="text-xs text-gray-400">{user.email}</span>
            </div>
            <AvatarMenu
              userId={user.id}
              fullName={fullName}
              email={user.email ?? ''}
              currentAvatarUrl={profile?.avatar_url}
              dict={dict}
            />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        {role === 'admin' ? (
          <AdminDashboard dict={dict} appointments={adminAppointments} catalog={catalog} />
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-8 flex flex-wrap gap-2">
              {dict.welcome} <span className="text-yellow-500">{fullName}</span>
            </h1>
            <UpcomingAppointments dict={dict} appointments={upcoming} catalog={catalog} />
            <HaircutHistory dict={dict} history={history} catalog={catalog} />
          </>
        )}
      </main>
    </div>
  )
}
