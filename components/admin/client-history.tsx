'use client'

import { useState, useMemo } from 'react'
import { updateAppointmentNote } from '@/app/actions/admin'
import { ChevronDown, ChevronRight, Pencil, Users2, Loader2 } from 'lucide-react'
import type { AdminAppointment, CatalogMaps } from '@/app/dashboard/page'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-yellow-500/20 text-yellow-400',
  cancelled:  'bg-red-500/20 text-red-400',
  completed:  'bg-green-500/20 text-green-400',
  rescheduled:'bg-blue-500/20 text-blue-400',
}

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
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={1000}
        rows={3}
        autoFocus
        placeholder="Notas del corte…"
        className="bg-black/80 border border-yellow-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none w-full"
      />
      <div className="flex gap-1.5">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-2.5 py-1 bg-yellow-500 text-black rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center gap-1"
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
      className="group flex items-start gap-1.5 text-left w-full max-w-[240px]"
      title={note || 'Agregar nota del corte'}
    >
      {note ? (
        <span className="text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{note}</span>
      ) : (
        <span className="text-xs text-gray-600 italic">+ agregar nota</span>
      )}
      <Pencil className="w-3 h-3 text-gray-600 group-hover:text-yellow-400 flex-shrink-0 mt-0.5 transition-colors opacity-0 group-hover:opacity-100" />
    </button>
  )
}

type ClientGroup = {
  userId: string
  name: string
  email: string
  appointments: AdminAppointment[]
}

export function ClientHistory({
  appointments,
  catalog,
}: {
  appointments: AdminAppointment[]
  catalog: CatalogMaps
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const clients = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>()
    appointments.forEach(a => {
      const userId = a.user_id
      if (!map.has(userId)) {
        map.set(userId, {
          userId,
          name: a.profiles?.full_name || 'Cliente desconocido',
          email: a.profiles?.email || '',
          appointments: [],
        })
      }
      map.get(userId)!.appointments.push(a)
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [appointments])

  const filtered = useMemo(() =>
    clients.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    ), [clients, search])

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <Users2 className="w-5 h-5 text-yellow-500" />
            Historial de Clientes
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} clientes registrados</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o email…"
          className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors w-full sm:w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No se encontraron clientes.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => {
            const isOpen = expanded === client.userId
            const sorted = [...client.appointments].sort(
              (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
            )
            const completedCount = client.appointments.filter(a => a.status === 'completed' || (a.status !== 'cancelled' && new Date(a.appointment_date) < new Date())).length

            return (
              <div key={client.userId} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : client.userId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-500 font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{client.name}</p>
                      <p className="text-gray-500 text-xs">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">
                        <span className="text-white font-semibold">{client.appointments.length}</span> cita{client.appointments.length !== 1 ? 's' : ''}
                      </p>
                      {completedCount > 0 && (
                        <p className="text-xs text-green-400">{completedCount} corte{completedCount !== 1 ? 's' : ''} realizado{completedCount !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full font-bold sm:hidden">
                      {client.appointments.length}
                    </span>
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    }
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500 text-xs bg-black/30">
                          <th className="px-5 py-3 font-normal">Fecha</th>
                          <th className="px-5 py-3 font-normal">Servicio</th>
                          <th className="px-5 py-3 font-normal">Barbero</th>
                          <th className="px-5 py-3 font-normal">Estado</th>
                          <th className="px-5 py-3 font-normal">Asistencia</th>
                          <th className="px-5 py-3 font-normal">Notas del Corte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map(a => {
                          const d = new Date(a.appointment_date)
                          return (
                            <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors text-white">
                              <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                                <span>{d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span className="text-gray-500 ml-1.5 text-xs">
                                  {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-sm font-medium">{catalog.servicesMap[a.service_id] || a.service_id}</td>
                              <td className="px-5 py-3.5 text-sm text-gray-400">{catalog.barbersMap[a.barber_id] || a.barber_id}</td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[a.status] || 'bg-white/10 text-gray-400'}`}>
                                  {a.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                {a.attended === true  && <span className="text-xs text-green-400 font-bold">✓ Asistió</span>}
                                {a.attended === false && <span className="text-xs text-red-400 font-bold">✗ No asistió</span>}
                                {a.attended === null  && <span className="text-xs text-gray-600">—</span>}
                              </td>
                              <td className="px-5 py-3.5 max-w-xs">
                                <NoteCell id={a.id} initial={a.notes ?? null} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
