'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getAllGalleryImages,
} from '@/app/actions/gallery'
import type { GalleryImage } from '@/app/actions/gallery'
import {
  Plus, Trash2, Pencil, X, Loader2, ImageIcon, Eye, EyeOff, Upload, Check,
} from 'lucide-react'

/* ─── Upload modal ─────────────────────────────────────────── */
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  const handleSave = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(uploadData.path)
      const result = await addGalleryImage(title || file.name.replace(/\.[^.]+$/, ''), publicUrl, 0)
      if (result.error) throw new Error(result.error)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Photo</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="relative cursor-pointer border-2 border-dashed border-white/20 hover:border-yellow-500/50 rounded-xl transition-colors overflow-hidden"
        >
          {preview ? (
            <div className="relative h-56">
              <Image src={preview} alt="preview" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Upload className="w-8 h-8 text-white" />
              </div>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-3 text-gray-500">
              <ImageIcon className="w-10 h-10" />
              <p className="text-sm">Click or drag an image here</p>
              <p className="text-xs">JPG, PNG, WEBP · max 10 MB</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Title (optional)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Precision Fade"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Delete confirm modal ─────────────────────────────────── */
function DeleteConfirmModal({
  image,
  onClose,
  onConfirm,
  deleting,
}: {
  image: GalleryImage
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!deleting ? onClose : undefined} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Photo preview strip */}
        {image.image_url && (
          <div className="relative h-32 w-full overflow-hidden">
            <Image src={image.image_url} alt={image.title || 'Photo'} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-5">
          {/* Icon + message */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Delete photo?</h3>
              {image.title && (
                <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">&ldquo;{image.title}&rdquo;</p>
              )}
              <p className="text-gray-500 text-xs mt-2">This action cannot be undone. The image will be permanently removed.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="w-4 h-4" /> Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit modal ───────────────────────────────────────────── */
function EditModal({
  image,
  onClose,
  onSaved,
}: {
  image: GalleryImage
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(image.title)
  const [active, setActive] = useState(image.active)
  const [sortOrder, setSortOrder] = useState(image.sort_order)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    const result = await updateGalleryImage(image.id, title, active, sortOrder)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit Photo</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative h-36 rounded-xl overflow-hidden">
          <Image src={image.image_url} alt={image.title} fill className="object-cover" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500 transition-colors text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Visible on landing page</span>
            <button
              onClick={() => setActive(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${active ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────── */
export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<GalleryImage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    const data = await getAllGalleryImages()
    setImages(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteGalleryImage(deleteTarget.id, deleteTarget.image_url)
    setDeleting(false)
    setDeleteTarget(null)
    await load()
  }

  return (
    <>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-yellow-500" />
            Gallery
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-yellow-500 text-black font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Photo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-3 text-gray-500">
            <ImageIcon className="w-12 h-12" />
            <p className="text-sm">No photos yet. Add your first photo above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map(img => (
              <div key={img.id} className="group relative rounded-xl overflow-hidden bg-black border border-white/10 hover:border-white/20 transition-colors">
                <div className="aspect-[3/4] relative">
                  <Image
                    src={img.image_url}
                    alt={img.title || 'Gallery photo'}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  {!img.active && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <EyeOff className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-2">
                  <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{img.title || '—'}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditTarget(img)}
                      className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-yellow-500 hover:text-black text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(img)}
                      className="flex items-center justify-center bg-white/10 hover:bg-red-500 text-white text-xs py-1.5 px-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Active badge */}
                <div className="absolute top-2 right-2">
                  {img.active
                    ? <span className="flex items-center gap-1 bg-green-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm"><Eye className="w-2.5 h-2.5" /> Live</span>
                    : <span className="flex items-center gap-1 bg-black/80 text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm"><EyeOff className="w-2.5 h-2.5" /> Hidden</span>
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {editTarget && <EditModal image={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {deleteTarget && (
        <DeleteConfirmModal
          image={deleteTarget}
          deleting={deleting}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  )
}
