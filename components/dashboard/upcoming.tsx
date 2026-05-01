'use client'

import { useState } from 'react'
import { Calendar, Clock, Edit2, XCircle, Loader2, CheckCircle2, X, Scissors, Plus } from 'lucide-react'
import Link from 'next/link'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { addDays, format } from 'date-fns'
import clsx from 'clsx'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { rescheduleAppointment, cancelAppointment } from '@/app/actions/appointments'
import type { Appointment, CatalogMaps } from '@/app/dashboard/page'
import { useRouter } from 'next/navigation'

const TIME_SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']

function parseDateTime(date: Date, timeSlot: string): string {
  const [timePart, meridiem] = timeSlot.split(' ')
  let [hours, minutes] = timePart.split(':').map(Number)
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function RescheduleModal({
  appt, dict, catalog, onClose, onSuccess,
}: {
  appt: Appointment
  dict: typeof dictionaries.en
  catalog: CatalogMaps
  onClose: () => void
  onSuccess: () => void
}) {
  const [newDate, setNewDate] = useState<Date | undefined>(new Date())
  const [newTime, setNewTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!newDate || !newTime) return
    setLoading(true)
    setError(null)
    const isoDate = parseDateTime(newDate, newTime)
    const result = await rescheduleAppointment(appt.id, isoDate)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white">{dict.reschedule}</h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {catalog.servicesMap[appt.service_id] || appt.service_id} · {catalog.barbersMap[appt.barber_id] || appt.barber_id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="bg-black/50 p-4 rounded-xl border border-white/5 flex-shrink-0">
              <DayPicker
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={{ before: new Date(), after: addDays(new Date(), 30) }}
                className="mx-auto"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <p className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wider">{dict.upcomingSelectTime}</p>
              <div className="grid grid-cols-2 gap-2 flex-1">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => setNewTime(t)}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-semibold transition-all',
                      newTime === t
                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                        : 'bg-black/50 text-white border-white/10 hover:border-yellow-500/50'
                    )}
                  >{t}</button>
                ))}
              </div>
              {newDate && newTime && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-yellow-400 text-sm font-medium">
                    {dict.upcomingNewTime} {format(newDate, 'EEE, MMM d')} at {newTime}
                  </p>
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/10">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium">
            {dict.cancel}
          </button>
          <button onClick={handleConfirm} disabled={!newDate || !newTime || loading}
            className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {dict.upcomingSaving}</>
              : <><CheckCircle2 className="w-4 h-4" /> {dict.confirmReschedule}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function AppointmentCard({
  appt, dict, catalog,
}: {
  appt: Appointment
  dict: typeof dictionaries.en
  catalog: CatalogMaps
}) {
  const router = useRouter()
  const [showReschedule, setShowReschedule] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apptDate = new Date(appt.appointment_date)
  const day = apptDate.getDate()
  const month = apptDate.toLocaleString('en-US', { month: 'short' })
  const timeStr = apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const weekday = apptDate.toLocaleString('en-US', { weekday: 'short' })

  const handleCancel = async () => {
    if (!confirm(dict.upcomingCancelConfirm)) return
    setLoading(true)
    const result = await cancelAppointment(appt.id)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  return (
    <>
      <div className="bg-black p-6 rounded-xl border border-white/5 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-center min-w-[80px]">
              <div className="text-yellow-500 font-bold text-2xl">{day}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest">{month}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                {catalog.servicesMap[appt.service_id] || appt.service_id}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-500" /> {timeStr}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-yellow-500" /> {weekday}</span>
              </div>
              <p className="text-sm mt-2 text-gray-500">
                {dict.upcomingBarber} {catalog.barbersMap[appt.barber_id] || appt.barber_id}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button onClick={() => setShowReschedule(true)} disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-all text-sm font-medium">
              <Edit2 className="w-4 h-4" /> {dict.reschedule}
            </button>
            <button onClick={handleCancel} disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 px-6 py-3 rounded-xl transition-all text-sm font-medium disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {dict.cancelAppointment}
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {showReschedule && (
        <RescheduleModal
          appt={appt} dict={dict} catalog={catalog}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => { setShowReschedule(false); router.refresh() }}
        />
      )}
    </>
  )
}

export function UpcomingAppointments({
  dict, appointments, catalog,
}: {
  dict: typeof dictionaries.en
  appointments: Appointment[]
  catalog: CatalogMaps
}) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <h2 className="text-sm tracking-widest uppercase font-bold mb-6 text-white">{dict.upcomingSettings}</h2>
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Scissors className="w-7 h-7 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold mb-1">{dict.noUpcoming}</p>
            <p className="text-gray-500 text-sm">{dict.upcomingBookSubtitle}</p>
          </div>
          <Link href="/booking"
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:shadow-[0_0_28px_rgba(234,179,8,0.4)]">
            <Plus className="w-4 h-4" /> {dict.upcomingBookNow}
          </Link>
        </div>
      ) : (
        appointments.map(appt => (
          <AppointmentCard key={appt.id} appt={appt} dict={dict} catalog={catalog} />
        ))
      )}
    </div>
  )
}
