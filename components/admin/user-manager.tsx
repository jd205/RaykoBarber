'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Shield, Loader2, Search, History, X, Scissors, Calendar, StickyNote, Save, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { toggleUserRole, updateAppointmentNote } from '@/app/actions/admin'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
}

type AppointmentRecord = {
  id: string
  service_id: string
  barber_id: string
  appointment_date: string
  status: string
  notes: string | null
}

const LEGACY_SERVICES: Record<string, string> = { '1': 'Premium Haircut', '2': 'Hair & Beard Trim', '3': 'Hot Towel Shave' }
const LEGACY_BARBERS: Record<string, string> = { '1': 'James "The Blade"', '2': 'Marcus Black' }
const LEGACY_PRICES: Record<string, string> = { '1': '$45', '2': '$65', '3': '$40' }
const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

function NoteCell({ appt }: { appt: AppointmentRecord }) {
  const [note, setNote] = useState(appt.notes || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    await updateAppointmentNote(appt.id, note)
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="group flex items-start gap-2 cursor-pointer"
      >
        <StickyNote className="w-3.5 h-3.5 text-gray-500 group-hover:text-yellow-500 transition-colors mt-0.5 flex-shrink-0" />
        {note ? (
          <span className="text-gray-300 text-xs leading-relaxed">{note}</span>
        ) : (
          <span className="text-gray-600 text-xs italic group-hover:text-gray-400 transition-colors">Add note…</span>
        )}
        {saved && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        autoFocus
        rows={2}
        placeholder="Add a note about this visit…"
        className="w-full bg-black border border-white/20 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-500 resize-none"
      />
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 bg-yellow-500 text-black text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
        <button
          onClick={() => { setEditing(false); setNote(appt.notes || '') }}
          className="text-gray-400 text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ClientHistoryModal({
  user,
  onClose,
}: {
  user: Profile
  onClose: () => void
}) {
  const [appts, setAppts] = useState<AppointmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [servicesMap, setServicesMap] = useState<Record<string, string>>(LEGACY_SERVICES)
  const [barbersMap, setBarbersMap] = useState<Record<string, string>>(LEGACY_BARBERS)
  const [pricesMap, setPricesMap] = useState<Record<string, string>>(LEGACY_PRICES)
  const supabase = createClient()

  useEffect(() => {
    const fetchHistory = async () => {
      const [{ data: apptData }, { data: servicesData }, { data: barbersData }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, service_id, barber_id, appointment_date, status, notes')
          .eq('user_id', user.id)
          .order('appointment_date', { ascending: false }),
        supabase.from('services').select('id, name, price').eq('active', true),
        supabase.from('barbers').select('id, name').eq('active', true),
      ])
      if (apptData) setAppts(apptData as AppointmentRecord[])
      if (servicesData) {
        const sm = { ...LEGACY_SERVICES }
        const pm = { ...LEGACY_PRICES }
        servicesData.forEach((s: { id: string; name: string; price: number }) => {
          sm[s.id] = s.name
          pm[s.id] = `$${Number(s.price).toFixed(0)}`
        })
        setServicesMap(sm)
        setPricesMap(pm)
      }
      if (barbersData) {
        const bm = { ...LEGACY_BARBERS }
        barbersData.forEach((b: { id: string; name: string }) => { bm[b.id] = b.name })
        setBarbersMap(bm)
      }
      setLoading(false)
    }
    fetchHistory()
  }, [user.id])

  const total = appts.filter(a => a.status === 'completed').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <History className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{user.full_name || 'Client'}</h3>
              <p className="text-gray-400 text-sm">{user.email} · {total} completed visit{total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
          ) : appts.length === 0 ? (
            <div className="text-center py-12">
              <Scissors className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No appointments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appts.map(a => {
                const d = new Date(a.appointment_date)
                return (
                  <div key={a.id} className="bg-black border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Date */}
                      <div className="flex-shrink-0 text-center bg-white/5 border border-white/10 rounded-xl p-3 min-w-[64px]">
                        <Calendar className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                        <div className="text-white font-bold text-sm leading-none">{format(d, 'd')}</div>
                        <div className="text-gray-400 text-xs mt-0.5">{format(d, 'MMM yy')}</div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-white font-semibold">{servicesMap[a.service_id] || a.service_id}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] || 'bg-white/10 text-gray-400'}`}>
                            {a.status}
                          </span>
                          <span className="text-gray-500 text-sm">{pricesMap[a.service_id] || ''}</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                          {barbersMap[a.barber_id] || a.barber_id} · {format(d, 'h:mm a')}
                        </p>

                        {/* Notes */}
                        <NoteCell appt={a} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function UserManager() {
  const [users, setUsers] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [historyUser, setHistoryUser] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    const q = query.toLowerCase()
    setFiltered(
      q
        ? users.filter(u =>
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
          )
        : users
    )
  }, [query, users])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as Profile[])
    setLoading(false)
  }

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'client' : 'admin'
    if (!confirm(`Change this user to ${newRole}?`)) return
    setTogglingId(userId)
    await toggleUserRole(userId, newRole)
    await fetchUsers()
    setTogglingId(null)
  }

  return (
    <>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-500" />
            User Management
          </h2>
          <div className="relative w-full md:w-auto">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full md:w-64 bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 text-sm">
                  <th className="py-4 pr-4 font-normal">Name</th>
                  <th className="py-4 pr-4 font-normal">Email</th>
                  <th className="py-4 pr-4 font-normal">Role</th>
                  <th className="py-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-500 text-sm">No users found.</td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-white">
                    <td className="py-4 pr-4 font-medium">{u.full_name || 'No Name'}</td>
                    <td className="py-4 pr-4 text-gray-400 text-sm">{u.email || '—'}</td>
                    <td className="py-4 pr-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-gray-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setHistoryUser(u)}
                          className="flex items-center gap-1.5 text-sm bg-black hover:bg-white/5 border border-white/10 px-3 py-2 rounded-lg transition-colors text-gray-300 hover:text-white"
                          title="View history & notes"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                        <button
                          onClick={() => toggleRole(u.id, u.role)}
                          disabled={togglingId === u.id}
                          className="flex items-center gap-1.5 text-sm bg-black hover:bg-white/5 border border-white/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {togglingId === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Shield className="w-4 h-4" />}
                          Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyUser && (
        <ClientHistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />
      )}
    </>
  )
}
