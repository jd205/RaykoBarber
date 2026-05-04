'use client'

import { useState } from 'react'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { CalendarView } from '@/components/admin/calendar-view'
import { UserManager } from '@/components/admin/user-manager'
import { AppointmentsList } from '@/components/admin/appointments-list'
import { NotificationsBell } from '@/components/admin/notifications-bell'
import { BarbershopSettings } from '@/components/admin/barbershop-settings'
import { ServicesManager } from '@/components/admin/services-manager'
import { BarbersManager } from '@/components/admin/barbers-manager'
import { ClientHistory } from '@/components/admin/client-history'
import type { AdminAppointment, CatalogMaps } from '@/app/dashboard/page'
import { GalleryManager } from '@/components/admin/gallery-manager'
import { SquareConnect } from '@/components/admin/square-connect'
import { Calendar, List, Users, Settings, Scissors, UserCheck, Images, ScrollText, CreditCard } from 'lucide-react'

type Tab = 'calendar' | 'appointments' | 'users' | 'services' | 'barbers' | 'gallery' | 'settings' | 'history' | 'payments'

const TABS: { id: Tab; labelKey: keyof typeof dictionaries.en; icon: React.ElementType }[] = [
  { id: 'calendar',     labelKey: 'tabCalendar',     icon: Calendar    },
  { id: 'appointments', labelKey: 'tabAppointments', icon: List        },
  { id: 'history',      labelKey: 'tabHistory',      icon: ScrollText  },
  { id: 'users',        labelKey: 'tabUsers',        icon: Users       },
  { id: 'services',     labelKey: 'tabServices',     icon: Scissors    },
  { id: 'barbers',      labelKey: 'tabBarbers',      icon: UserCheck   },
  { id: 'gallery',      labelKey: 'tabGallery',      icon: Images      },
  { id: 'payments',     labelKey: 'tabPayments',     icon: CreditCard  },
  { id: 'settings',     labelKey: 'tabSettings',     icon: Settings    },
]

export function AdminDashboard({
  dict,
  appointments,
  catalog,
}: {
  dict: typeof dictionaries.en
  appointments: AdminAppointment[]
  catalog: CatalogMaps
}) {
  const [activeTab, setActiveTab] = useState<Tab>('calendar')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">{dict.adminTitle}</h1>
          <p className="text-gray-400 mt-1">{dict.dailyAppointments}</p>
        </div>
        <NotificationsBell dict={dict} />
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-[#111] border border-white/10 rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{dict[labelKey] as string}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'calendar'     && <CalendarView appointments={appointments} catalog={catalog} />}
      {activeTab === 'appointments' && <AppointmentsList dict={dict} appointments={appointments} catalog={catalog} />}
      {activeTab === 'history'      && <ClientHistory appointments={appointments} catalog={catalog} />}
      {activeTab === 'users'        && <UserManager />}
      {activeTab === 'services'     && <ServicesManager />}
      {activeTab === 'barbers'      && <BarbersManager />}
      {activeTab === 'gallery'      && <GalleryManager />}
      {activeTab === 'payments'     && <SquareConnect />}
      {activeTab === 'settings'     && <BarbershopSettings />}
    </div>
  )
}
