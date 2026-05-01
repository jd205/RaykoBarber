'use client'

import { useState, useMemo } from 'react'
import { isToday, isSameMonth } from 'date-fns'
import { Mail, Loader2, CheckCircle2, List, X, UserCheck, UserX, Minus, ChevronDown, Pencil } from 'lucide-react'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { sendEmailReminder } from '@/app/actions/email'
import { updateAttendance, updateAppointmentNote } from '@/app/actions/admin'
import type { AdminAppointment, CatalogMaps } from '@/app/dashboard/page'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-yellow-500/20 text-yellow-400',
  cancelled:  'bg-red-500/20 text-red-400',
  completed:  'bg-green-500/20 text-green-400',
}

/* ─── Reminder button ──────────────────────────────────────── */
function ReminderButton({ appointmentId, dict }: { appointmentId: string; dict: typeof dictionaries.en }) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleSend = async () => {
    setState('loading')
    const result = await sendEmailReminder(appointmentId)
    if (result.error) {
      setState('error'); setErrMsg(result.error)
      setTimeout(() => setState('idle'), 4000)
    } else setState('sent')
  }

  if (state === 'sent') return (
    <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
      <CheckCircle2 className="w-4 h-4" /> {dict.reminderSent}
    </span>
  )

  return (
    <button
      onClick={handleSend}
      disabled={state === 'loading'}
      title={state === 'error' ? errMsg : dict.sendReminder}
      className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
        state === 'error'
          ? 'border-red-500/30 text-red-400 bg-red-500/10'
          : 'border-white/10 text-gray-300 hover:border-yellow-500/50 hover:text-yellow-400'
      }`}
    >
      {state === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
      {state === 'error' ? 'Error' : dict.sendReminder}
    </button>
  )
}

/* ─── Attendance toggle ────────────────────────────────────── */
function AttendanceToggle({ id, initial }: { id: string; initial: boolean | null }) {
  const [value, setValue] = useState<boolean | null>(initial)
  const [saving, setSaving] = useState(false)

  const cycle = async () => {
    const next = value === null ? true : value === true ? false : null
    setSaving(true)
    await updateAttendance(id, next)
    setValue(next)
    setSaving(false)
  }

  if (saving) return <Loader2 className="w-4 h-4 animate-spin text-gray-500 mx-auto" />

  if (value === true) return (
    <button onClick={cycle} title="Click to change" className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">
      <UserCheck className="w-3.5 h-3.5" /> Attended
    </button>
  )
  if (value === false) return (
    <button onClick={cycle} title="Click to change" className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">
      <UserX className="w-3.5 h-3.5" /> No-show
    </button>
  )
  return (
    <button onClick={cycle} title="Mark attendance" className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-gray-300 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors">
      <Minus className="w-3.5 h-3.5" /> Mark
    </button>
  )
}

/* ─── Note cell ────────────────────────────────────────────── */
function NoteCell({ id, initial }: { id: string; initial: string | null }) {
  const [note, setNote] = useState(initial || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await updateAppointmentNote(id, note)
    setSaving(false)
    setEditing(false)
  }

  if (editing) return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        autoFocus
        className="bg-black/80 border border-yellow-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none w-full"
      />
      <div className="flex gap-1.5">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-2.5 py-1 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
        </button>
        <button
          onClick={() => { setNote(initial || ''); setEditing(false) }}
          className="text-xs px-2.5 py-1 border border-white/20 text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left max-w-[180px]"
      title={note || 'Agregar nota'}
    >
      {note ? (
        <span className="text-xs text-gray-300 truncate max-w-[155px]">{note}</span>
      ) : (
        <span className="text-xs text-gray-600 italic">+ nota</span>
      )}
      <Pencil className="w-3 h-3 text-gray-600 group-hover:text-yellow-400 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100" />
    </button>
  )
}

/* ─── Small select helper ──────────────────────────────────── */
function FilterSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-black/60 border border-white/10 rounded-lg pl-2.5 pr-6 py-1 text-xs text-gray-300 focus:outline-none focus:border-yellow-500/50 transition-colors cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-3 h-3 text-gray-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────── */
type ColFilters = {
  client: string
  email: string
  service: string
  barber: string
  date: string
  status: string
  attended: string
}

const EMPTY_FILTERS: ColFilters = { client: '', email: '', service: '', barber: '', date: '', status: '', attended: '' }

export function AppointmentsList({
  dict,
  appointments,
  catalog,
}: {
  dict: typeof dictionaries.en
  appointments: AdminAppointment[]
  catalog: CatalogMaps
}) {
  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const [col, setCol] = useState<ColFilters>(EMPTY_FILTERS)

  const hasActiveFilter = Object.values(col).some(v => v !== '')

  /* Step 1 — period filter */
  const byPeriod = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.appointment_date)
      return period === 'day' ? isToday(d) : isSameMonth(d, new Date())
    }), [appointments, period])

  /* Step 2 — column filters */
  const filtered = useMemo(() =>
    byPeriod.filter(a => {
      const d = new Date(a.appointment_date)
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const fullDate = `${dateStr} ${timeStr}`.toLowerCase()

      const attendedLabel = a.attended === true ? 'attended' : a.attended === false ? 'no-show' : 'not marked'

      if (col.client  && !(a.profiles?.full_name || '').toLowerCase().includes(col.client.toLowerCase()))  return false
      if (col.email   && !(a.profiles?.email     || '').toLowerCase().includes(col.email.toLowerCase()))   return false
      if (col.service && col.service !== (catalog.servicesMap[a.service_id] || a.service_id))              return false
      if (col.barber  && col.barber  !== (catalog.barbersMap[a.barber_id]   || a.barber_id))               return false
      if (col.date    && !fullDate.includes(col.date.toLowerCase()))                                        return false
      if (col.status  && col.status  !== a.status)                                                          return false
      if (col.attended && col.attended !== attendedLabel)                                                   return false
      return true
    }), [byPeriod, col, catalog])

  /* Unique values for dropdowns */
  const serviceOptions  = useMemo(() => [...new Set(byPeriod.map(a => catalog.servicesMap[a.service_id] || a.service_id))], [byPeriod, catalog])
  const barberOptions   = useMemo(() => [...new Set(byPeriod.map(a => catalog.barbersMap[a.barber_id]   || a.barber_id))],  [byPeriod, catalog])

  const inputCls = 'w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors'

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <List className="w-5 h-5 text-yellow-500" />
            {dict.appointmentsList}
          </h2>
          {hasActiveFilter && (
            <button
              onClick={() => setCol(EMPTY_FILTERS)}
              className="flex items-center gap-1 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        <div className="flex bg-black rounded-xl border border-white/10 p-1 gap-1">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${period === 'day' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {dict.filterDay}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${period === 'month' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {dict.filterMonth}
          </button>
        </div>
      </div>

      {byPeriod.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{dict.noAppointments}</p>
      ) : (
        <>
          {/* ── Result count ── */}
          <p className="text-xs text-gray-500 mb-3">
            Showing <span className="text-gray-300 font-semibold">{filtered.length}</span> of {byPeriod.length} appointments
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                {/* Column labels */}
                <tr className="border-b border-white/10 text-gray-500 text-sm">
                  <th className="py-2.5 pr-3 font-normal w-36">{dict.client}</th>
                  <th className="py-2.5 pr-3 font-normal w-40">{dict.email}</th>
                  <th className="py-2.5 pr-3 font-normal w-36">{dict.service}</th>
                  <th className="py-2.5 pr-3 font-normal w-32">{dict.barber}</th>
                  <th className="py-2.5 pr-3 font-normal w-28">{dict.date}</th>
                  <th className="py-2.5 pr-3 font-normal w-28">{dict.status}</th>
                  <th className="py-2.5 pr-3 font-normal w-28">Attendance</th>
                  <th className="py-2.5 pr-3 font-normal w-48">{dict.notes}</th>
                  <th className="py-2.5 font-normal text-right w-28">Reminder</th>
                </tr>
                {/* Column filters */}
                <tr className="border-b border-white/5">
                  <td className="pb-2.5 pr-3">
                    <input value={col.client}   onChange={e => setCol(p => ({ ...p, client: e.target.value }))}   placeholder="Search name…"  className={inputCls} />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <input value={col.email}    onChange={e => setCol(p => ({ ...p, email: e.target.value }))}    placeholder="Search email…" className={inputCls} />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <FilterSelect value={col.service} onChange={v => setCol(p => ({ ...p, service: v }))} options={serviceOptions} placeholder="All services" />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <FilterSelect value={col.barber}  onChange={v => setCol(p => ({ ...p, barber: v }))}  options={barberOptions}  placeholder="All barbers"  />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <input value={col.date}    onChange={e => setCol(p => ({ ...p, date: e.target.value }))}    placeholder="e.g. Apr 25"  className={inputCls} />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <FilterSelect value={col.status}   onChange={v => setCol(p => ({ ...p, status: v }))}   options={['scheduled','completed','cancelled']} placeholder="All statuses" />
                  </td>
                  <td className="pb-2.5 pr-3">
                    <FilterSelect value={col.attended} onChange={v => setCol(p => ({ ...p, attended: v }))} options={['attended','no-show','not marked']}   placeholder="All"          />
                  </td>
                  <td className="pb-2.5 pr-3" />
                  <td className="pb-2.5" />
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-gray-500 text-sm">
                      No appointments match the active filters.{' '}
                      <button onClick={() => setCol(EMPTY_FILTERS)} className="text-yellow-400 hover:underline">Clear all</button>
                    </td>
                  </tr>
                ) : filtered.map(a => {
                  const d = new Date(a.appointment_date)
                  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-white">
                      <td className="py-3 pr-3 font-medium text-sm">{a.profiles?.full_name || '—'}</td>
                      <td className="py-3 pr-3 text-gray-400 text-xs">{a.profiles?.email || '—'}</td>
                      <td className="py-3 pr-3 text-sm">{catalog.servicesMap[a.service_id] || a.service_id}</td>
                      <td className="py-3 pr-3 text-gray-400 text-sm">{catalog.barbersMap[a.barber_id] || a.barber_id}</td>
                      <td className="py-3 pr-3 text-sm">
                        <span className="text-white">{dateStr}</span>
                        <span className="text-gray-500 ml-1">{timeStr}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[a.status] || 'bg-white/10 text-gray-400'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <AttendanceToggle id={a.id} initial={a.attended ?? null} />
                      </td>
                      <td className="py-3 pr-3">
                        <NoteCell id={a.id} initial={a.notes ?? null} />
                      </td>
                      <td className="py-3 text-right">
                        {a.status === 'scheduled' && <ReminderButton appointmentId={a.id} dict={dict} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
