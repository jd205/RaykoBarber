'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Calendar as CalendarIcon, Clock, Scissors, User, Loader2, LogIn, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { bookAppointment, getBarberBookedSlots } from '@/app/actions/appointments'
import { useRouter } from 'next/navigation'
import type { Dict } from '@/lib/i18n/dictionaries'

// Loaded client-side only — accesses window.Square
const PaymentForm = dynamic(
  () => import('./payment-form').then(m => m.PaymentForm),
  { ssr: false }
)

type DbService = {
  id: string
  name: string
  price: number
  duration_minutes: number
  description: string | null
}

type DbBarber = {
  id: string
  name: string
  bio: string | null
  photo_url: string | null
}

const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

function parseDateTime(date: Date, timeSlot: string): string {
  const [timePart, meridiem] = timeSlot.split(' ')
  let [hours, minutes] = timePart.split(':').map(Number)
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function BarberAvatar({ barber }: { barber: DbBarber }) {
  const [imgError, setImgError] = useState(false)
  const initials = barber.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (barber.photo_url && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={barber.photo_url} alt={barber.name}
        onError={() => setImgError(true)}
        className="w-12 h-12 rounded-full object-cover border-2 border-yellow-500/30 flex-shrink-0" />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

export function BookingCalendar({ dict, squareAppId, squareLocationId }: { dict: Dict; squareAppId: string; squareLocationId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<DbService[]>([])
  const [barbers, setBarbers] = useState<DbBarber[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [conflictModal, setConflictModal] = useState(false)
  // Set after appointment is created; used by the payment step
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null)

  const steps = [
    { id: 1, title: dict.service },
    { id: 2, title: dict.barber },
    { id: 3, title: dict.bookingStepDateTime },
    { id: 4, title: dict.bookingStepConfirm },
    { id: 5, title: dict.bookingStepPayment },
  ]

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser(),
      supabase.from('services').select('id, name, price, duration_minutes, description').eq('active', true).order('sort_order'),
      supabase.from('barbers').select('id, name, bio, photo_url').eq('active', true).order('sort_order'),
    ]).then(([authRes, servicesRes, barbersRes]) => {
      setIsLoggedIn(!!authRes.data.user)
      setServices((servicesRes.data as DbService[]) ?? [])
      setBarbers((barbersRes.data as DbBarber[]) ?? [])
      setCatalogLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedBarber || !date) { setBookedSlots([]); return }
    setSlotsLoading(true)
    const slotISOs = timeSlots.map(t => parseDateTime(date, t))
    getBarberBookedSlots(selectedBarber, slotISOs).then(booked => {
      setBookedSlots(booked)
      if (time && booked.includes(parseDateTime(date, time))) setTime(null)
      setSlotsLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarber, date])

  const handleNext = () => setStep(p => Math.min(p + 1, 5))
  const handleBack = () => setStep(p => Math.max(p - 1, 1))

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !date || !time) return
    setLoading(true)
    setError(null)
    const isoDate = parseDateTime(date, time)
    const result = await bookAppointment(selectedService, selectedBarber, isoDate)
    setLoading(false)
    if (result.error === 'SLOT_OCCUPIED') {
      const slotISOs = timeSlots.map(t => parseDateTime(date, t))
      getBarberBookedSlots(selectedBarber, slotISOs).then(setBookedSlots)
      setTime(null)
      setConflictModal(true)
      return
    }
    if (result.error) { setError(result.error); return }
    // Appointment created — proceed to payment
    setCurrentAppointmentId(result.appointmentId!)
    setStep(5)
  }

  const serviceDetail = services.find(s => s.id === selectedService)
  const barberDetail = barbers.find(b => b.id === selectedBarber)

  if (catalogLoading) {
    return (
      <div className="bg-[#111] p-8 rounded-2xl border border-white/10 w-full max-w-2xl mx-auto shadow-2xl flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          <p className="text-gray-400 text-sm">{dict.bookingLoading}</p>
        </div>
      </div>
    )
  }

  return (
    <>
    {conflictModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111] border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{dict.bookingConflictTitle}</h3>
          <p className="text-gray-400 text-sm">{dict.bookingConflictMsg}</p>
          <button
            onClick={() => { setConflictModal(false); setStep(3) }}
            className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors"
          >
            {dict.bookingConflictBtn}
          </button>
        </motion.div>
      </div>
    )}
    <div className="bg-[#111] p-8 rounded-2xl border border-white/10 w-full max-w-2xl mx-auto shadow-2xl">
      {/* Step indicators */}
      <div className="flex justify-between items-center mb-8">
        {steps.map(s => (
          <div key={s.id} className="flex flex-col items-center gap-2">
            <div className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all',
              step >= s.id
                ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                : 'bg-white/5 text-gray-500 border border-white/10'
            )}>
              {s.id}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:block">{s.title}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Service */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <Scissors className="w-6 h-6 text-yellow-500" /> {dict.bookingSelectService}
            </h2>
            {services.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{dict.bookingNoServices}</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {services.map(s => (
                  <button key={s.id} onClick={() => setSelectedService(s.id)}
                    className={clsx(
                      'w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center gap-4',
                      selectedService === s.id
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
                        : 'border-white/10 hover:border-white/30 bg-black/30'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-base text-white">{s.name}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {formatDuration(s.duration_minutes)}
                        {s.description && <span className="text-gray-600">· {s.description}</span>}
                      </div>
                    </div>
                    <div className="font-bold text-xl text-yellow-500 flex-shrink-0">${Number(s.price).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Barber */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <User className="w-6 h-6 text-yellow-500" /> {dict.bookingChooseBarber}
            </h2>
            {barbers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{dict.bookingNoBarbers}</p>
            ) : (
              <div className="space-y-3">
                {barbers.map(b => (
                  <button key={b.id} onClick={() => setSelectedBarber(b.id)}
                    className={clsx(
                      'w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4',
                      selectedBarber === b.id
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
                        : 'border-white/10 hover:border-white/30 bg-black/30'
                    )}
                  >
                    <BarberAvatar barber={b} />
                    <div className="min-w-0">
                      <div className="font-bold text-base text-white">{b.name}</div>
                      {b.bio && <div className="text-sm text-gray-400 line-clamp-1 mt-0.5">{b.bio}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
              <CalendarIcon className="w-6 h-6 text-yellow-500" /> {dict.bookingDateTime}
            </h2>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 flex-1">
                <DayPicker
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={{ before: new Date(), after: addDays(new Date(), 30) }}
                  className="mx-auto"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold mb-4 text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" /> {dict.bookingAvailableSlots}
                </h3>
                {slotsLoading ? (
                  <div className="flex items-center justify-center h-[120px] gap-2 text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                    {dict.bookingSlotsChecking}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map(t => {
                      const iso = date ? parseDateTime(date, t) : ''
                      const isBooked = bookedSlots.includes(iso)
                      return (
                        <button key={t}
                          onClick={() => !isBooked && setTime(t)}
                          disabled={isBooked}
                          className={clsx(
                            'p-3 rounded-lg border text-sm font-semibold transition-colors',
                            isBooked
                              ? 'bg-black/20 text-gray-600 border-white/5 cursor-not-allowed'
                              : time === t
                                ? 'bg-yellow-500 text-black border-yellow-500'
                                : 'bg-black/50 text-white border-white/10 hover:border-yellow-500/50'
                          )}
                        >
                          <span className={clsx(isBooked && 'line-through')}>{t}</span>
                          {isBooked && (
                            <span className="block text-xs text-red-400 mt-0.5 font-normal">
                              {dict.bookingSlotOccupied}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold mb-6 text-white text-center">{dict.bookingConfirmTitle}</h2>
            <div className="bg-black/50 border border-white/10 p-6 rounded-xl space-y-4 mb-6">
              <div className="flex justify-between items-start border-b border-white/10 pb-4 gap-4">
                <span className="text-gray-400 flex-shrink-0">{dict.service}</span>
                <div className="text-right">
                  <p className="font-bold text-white">{serviceDetail?.name || '—'}</p>
                  {serviceDetail && (
                    <p className="text-gray-500 text-sm mt-0.5">
                      {formatDuration(serviceDetail.duration_minutes)} · ${Number(serviceDetail.price).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-4 gap-4">
                <span className="text-gray-400">{dict.barber}</span>
                <div className="flex items-center gap-2">
                  {barberDetail && <BarberAvatar barber={barberDetail} />}
                  <span className="font-bold text-white">{barberDetail?.name || '—'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-400">{dict.bookingStepDateTime}</span>
                <span className="font-bold text-yellow-500 text-right">
                  {date ? format(date, 'PPP') : '—'} at {time || '—'}
                </span>
              </div>
            </div>

            {isLoggedIn === false ? (
              <div className="text-center space-y-4">
                <p className="text-gray-400 text-sm">{dict.bookingSignInRequired}</p>
                <a href="/?auth=login"
                  className="inline-flex items-center gap-2 bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-400 transition-colors">
                  <LogIn className="w-4 h-4" /> {dict.bookingSignInBtn}
                </a>
              </div>
            ) : (
              <>
                {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-yellow-500 text-black font-bold text-lg py-4 rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> {dict.bookingBooking}</>
                    : dict.bookingConfirmBtn}
                </button>
              </>
            )}
          </motion.div>
        )}
        {/* Step 5: Payment */}
        {step === 5 && currentAppointmentId && serviceDetail && (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-2xl font-bold mb-6 text-white text-center">{dict.bookingStepPayment}</h2>
            <PaymentForm
              appointmentId={currentAppointmentId}
              amountCents={Math.round(Number(serviceDetail.price) * 100)}
              squareAppId={squareAppId}
              squareLocationId={squareLocationId}
              onSuccess={() => router.push('/dashboard')}
              dict={{
                paymentCardLabel: dict.paymentCardLabel,
                paymentPay: dict.paymentPay,
                paymentPaying: dict.paymentPaying,
                paymentOrPayWith: dict.paymentOrPayWith,
                paymentSdkLoading: dict.paymentSdkLoading,
                paymentSuccess: dict.paymentSuccess,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation — hidden on payment step (PaymentForm handles its own submission) */}
      {step !== 5 && (
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={clsx('px-6 py-2 rounded-lg font-semibold', step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 text-white')}
          >
            {dict.bookingBack}
          </button>
          {step < 4 && (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !selectedService) ||
                (step === 2 && !selectedBarber) ||
                (step === 3 && (!date || !time))
              }
              className="bg-white text-black px-8 py-2 rounded-lg font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {dict.bookingNext}
            </button>
          )}
        </div>
      )}
    </div>
    </>
  )
}
