'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createService, updateService, deleteService } from '@/app/actions/services'
import type { Service } from '@/app/actions/services'
import { Scissors, Plus, Pencil, Trash2, Loader2, X, Clock, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react'

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

type ServiceForm = { name: string; price: number; duration_minutes: number; description: string; active: boolean }

const EMPTY: ServiceForm = { name: '', price: 0, duration_minutes: 30, description: '', active: true }

function ServiceModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Service
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ServiceForm>(
    initial
      ? { name: initial.name, price: initial.price, duration_minutes: initial.duration_minutes, description: initial.description ?? '', active: initial.active }
      : { ...EMPTY }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = form.name.trim().length > 0 && form.price > 0 && form.duration_minutes > 0 && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const result = initial
      ? await updateService(initial.id, form.name, form.price, form.duration_minutes, form.description, form.active)
      : await createService(form.name, form.price, form.duration_minutes, form.description)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl">
              <Scissors className="w-4 h-4 text-yellow-500" />
            </div>
            <h3 className="text-white font-bold">{initial ? 'Edit Service' : 'New Service'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Service Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Traditional Haircut"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Price + Duration side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Price ($)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number" min="0" step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Duration (min)</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number" min="5" step="5"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              Description <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. 12 years and under."
              rows={2}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600 resize-none"
            />
          </div>

          {/* Active toggle (edit only) */}
          {initial && (
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className="flex items-center gap-2 text-sm"
            >
              {form.active
                ? <ToggleRight className="w-6 h-6 text-yellow-500" />
                : <ToggleLeft className="w-6 h-6 text-gray-600" />}
              <span className={form.active ? 'text-white' : 'text-gray-500'}>
                {form.active ? 'Active' : 'Inactive'}
              </span>
            </button>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              {initial ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | Service | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('sort_order')
    if (data) setServices(data as Service[])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return
    setDeletingId(id)
    await deleteService(id)
    setServices(s => s.filter(x => x.id !== id))
    setDeletingId(null)
  }

  return (
    <>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
              <Scissors className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Services</h2>
              <p className="text-gray-400 text-sm">{services.length} service{services.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-yellow-500" /></div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
            <Scissors className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No services yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 pr-4 font-medium">Service</th>
                  <th className="py-3 pr-4 font-medium text-right">Price</th>
                  <th className="py-3 pr-4 font-medium text-right">Duration</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="text-white font-medium text-sm">{s.name}</p>
                      {s.description && <p className="text-gray-500 text-xs mt-0.5">{s.description}</p>}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-yellow-500 font-bold text-sm">${s.price.toFixed(2)}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className="text-gray-400 text-sm flex items-center justify-end gap-1">
                        <Clock className="w-3.5 h-3.5" />{formatDuration(s.duration_minutes)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        s.active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-500'
                      }`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal(s)}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                          {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

      {modal === 'add' && (
        <ServiceModal onClose={() => setModal(null)} onSaved={fetchServices} />
      )}
      {modal && modal !== 'add' && (
        <ServiceModal initial={modal as Service} onClose={() => setModal(null)} onSaved={fetchServices} />
      )}
    </>
  )
}
