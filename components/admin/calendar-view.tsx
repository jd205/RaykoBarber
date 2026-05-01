'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Mail, X, Scissors } from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday
} from 'date-fns'
import type { AdminAppointment, CatalogMaps } from '@/app/dashboard/page'

function DayDetailPanel({
  day,
  appointments,
  catalog,
  onClose,
}: {
  day: Date
  appointments: AdminAppointment[]
  catalog: CatalogMaps
  onClose: () => void
}) {
  return (
    <div className="mt-6 bg-black border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5 text-center">
            <div className="text-yellow-500 font-bold text-xl leading-none">{format(day, 'd')}</div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mt-0.5">{format(day, 'MMM')}</div>
          </div>
          <div>
            <p className="text-white font-bold">{format(day, 'EEEE')}</p>
            <p className="text-gray-400 text-sm">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Appointment list */}
      <div className="divide-y divide-white/5">
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No appointments for this day.</p>
        ) : appointments.map(a => {
          const t = new Date(a.appointment_date)
          return (
            <div key={a.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                {/* Time badge */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-center min-w-[64px] flex-shrink-0">
                  <Clock className="w-3 h-3 text-yellow-500 mx-auto mb-1" />
                  <span className="text-yellow-400 text-xs font-bold">{format(t, 'h:mm a')}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Scissors className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-white font-semibold text-sm">{catalog.servicesMap[a.service_id] || a.service_id}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{a.profiles?.full_name || 'Unknown client'}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-400 text-xs truncate">{a.profiles?.email || '—'}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Barber: {catalog.barbersMap[a.barber_id] || a.barber_id}
                  </div>
                </div>

                {/* Status */}
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  a.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                  a.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {a.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarView({ appointments, catalog }: { appointments: AdminAppointment[]; catalog: CatalogMaps }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const nextMonth = () => { setCurrentDate(addMonths(currentDate, 1)); setSelectedDay(null) }
  const prevMonth = () => { setCurrentDate(subMonths(currentDate, 1)); setSelectedDay(null) }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  const getAppts = (day: Date) =>
    appointments.filter(a => isSameDay(new Date(a.appointment_date), day))

  const selectedAppts = selectedDay ? getAppts(selectedDay) : []

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-yellow-500" />
          Schedule Overview
        </h2>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronLeft />
          </button>
          <span className="font-medium text-lg w-32 text-center text-white">{format(currentDate, 'MMMM yyyy')}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-black py-2 text-center text-sm font-bold text-gray-500">{d}</div>
        ))}

        {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
          <div key={`e-${i}`} className="bg-black/50 min-h-[90px] border-t border-white/5" />
        ))}

        {days.map(day => {
          const dayAppts = getAppts(day)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false

          return (
            <div
              key={day.toString()}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`min-h-[90px] border-t border-white/5 p-2 transition-colors cursor-pointer
                ${isSelected ? 'bg-yellow-500/20 ring-1 ring-inset ring-yellow-500/40' :
                  isToday(day) ? 'bg-yellow-500/10 hover:bg-yellow-500/15' : 'bg-black hover:bg-white/5'}
              `}
            >
              <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors
                ${isSelected ? 'bg-yellow-500 text-black' :
                  isToday(day) ? 'bg-yellow-500/50 text-white' : 'text-gray-400'}
              `}>
                {format(day, 'd')}
              </div>

              {dayAppts.length > 0 && (
                <div className="mt-1 space-y-1">
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a.id} className="bg-white/10 text-xs px-1.5 py-0.5 rounded text-white truncate">
                      {format(new Date(a.appointment_date), 'h:mm a')} · {a.profiles?.full_name?.split(' ')[0] || '—'}
                    </div>
                  ))}
                  {dayAppts.length > 2 && (
                    <div className="text-xs text-yellow-500 font-bold pl-1">+{dayAppts.length - 2} more</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <DayDetailPanel
          day={selectedDay}
          appointments={selectedAppts}
          catalog={catalog}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
