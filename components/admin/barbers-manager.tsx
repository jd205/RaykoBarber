'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBarber, updateBarber, deleteBarber } from '@/app/actions/services'
import type { Barber } from '@/app/actions/services'
import imageCompression from 'browser-image-compression'
import { User, Plus, Pencil, Trash2, Loader2, X, ToggleLeft, ToggleRight, ImageIcon, Upload, Link2 } from 'lucide-react'

function BarberCardAvatar({ barber }: { barber: Barber }) {
  const [err, setErr] = useState(false)
  const initials = barber.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  if (barber.photo_url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={barber.photo_url} alt={barber.name} onError={() => setErr(true)}
        className="w-12 h-12 rounded-full object-cover border-2 border-yellow-500/30 flex-shrink-0" />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold flex-shrink-0">
      {initials}
    </div>
  )
}

function BarberModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Barber
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, bio: initial.bio ?? '', photo_url: initial.photo_url ?? '', active: initial.active }
      : { name: '', bio: '', photo_url: '', active: true }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imgPreviewError, setImgPreviewError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const canSubmit = form.name.trim().length > 0 && !saving && !uploading

  const handleFileChange = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setImgPreviewError(false)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 400,
        useWebWorker: true,
      })
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `barber-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('barber-photos')
        .upload(fileName, compressed, { upsert: true, contentType: compressed.type })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: { publicUrl } } = supabase.storage.from('barber-photos').getPublicUrl(fileName)
      setForm(f => ({ ...f, photo_url: publicUrl }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const result = initial
      ? await updateBarber(initial.id, form.name, form.bio, form.photo_url, form.active)
      : await createBarber(form.name, form.bio, form.photo_url)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved(); onClose()
  }

  const initials = form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl">
              <User className="w-4 h-4 text-yellow-500" />
            </div>
            <h3 className="text-white font-bold">{initial ? 'Edit Barber' : 'New Barber'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Photo section */}
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="flex-shrink-0">
              {form.photo_url && !imgPreviewError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.photo_url}
                  alt="preview"
                  onError={() => setImgPreviewError(true)}
                  className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500/40"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold text-lg">
                  {initials || <User className="w-6 h-6" />}
                </div>
              )}
            </div>

            {/* Right: label + tabs + input */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> Photo
                <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>

              {/* Mode tabs */}
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setPhotoMode('upload')}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                    photoMode === 'upload'
                      ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      : 'text-gray-500 hover:text-gray-300 border-transparent'
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('url')}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                    photoMode === 'url'
                      ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      : 'text-gray-500 hover:text-gray-300 border-transparent'
                  }`}
                >
                  <Link2 className="w-3 h-3" /> URL
                </button>
              </div>

              {photoMode === 'upload' ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-white/20 hover:border-yellow-500/40 rounded-xl px-3 py-3 text-gray-500 hover:text-gray-300 transition-colors text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                      : <><Upload className="w-3.5 h-3.5" /> Click to upload image</>
                    }
                  </button>
                </>
              ) : (
                <input
                  value={form.photo_url}
                  onChange={e => {
                    setForm(f => ({ ...f, photo_url: e.target.value }))
                    setImgPreviewError(false)
                  }}
                  placeholder="https://..."
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
                />
              )}

              {uploadError && (
                <p className="text-red-400 text-xs mt-1.5">{uploadError}</p>
              )}

              {form.photo_url && (
                <button
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, photo_url: '' })); setImgPreviewError(false) }}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-1.5"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder='James "The Blade" Smith'
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              Bio <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="10+ years of precision cuts…"
              rows={3}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600 resize-none"
            />
          </div>

          {/* Active toggle (edit only) */}
          {initial && (
            <button type="button" onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className="flex items-center gap-2 text-sm">
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              {initial ? 'Save Changes' : 'Add Barber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function BarbersManager() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | Barber | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchBarbers = async () => {
    const { data } = await supabase.from('barbers').select('*').order('sort_order')
    if (data) setBarbers(data as Barber[])
    setLoading(false)
  }

  useEffect(() => { fetchBarbers() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this barber?')) return
    setDeletingId(id)
    await deleteBarber(id)
    setBarbers(b => b.filter(x => x.id !== id))
    setDeletingId(null)
  }

  return (
    <>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
              <User className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Barbers</h2>
              <p className="text-gray-400 text-sm">{barbers.length} barber{barbers.length !== 1 ? 's' : ''} on the team</p>
            </div>
          </div>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Barber
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-yellow-500" /></div>
        ) : barbers.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
            <User className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No barbers yet. Add your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map(b => (
              <div key={b.id} className="bg-black border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors flex flex-col gap-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <BarberCardAvatar barber={b} />
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{b.name}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      b.active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-500'
                    }`}>
                      {b.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {b.bio && <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{b.bio}</p>}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => setModal(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium disabled:opacity-50">
                    {deletingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'add' && (
        <BarberModal onClose={() => setModal(null)} onSaved={fetchBarbers} />
      )}
      {modal && modal !== 'add' && (
        <BarberModal initial={modal as Barber} onClose={() => setModal(null)} onSaved={fetchBarbers} />
      )}
    </>
  )
}
