'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addReview, deleteReview } from '@/app/actions/settings'
import { Star, Plus, Trash2, Loader2, CheckCircle2, X } from 'lucide-react'
import type { Review } from '@/app/actions/settings'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i <= (hover || value) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700 fill-gray-700'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function AddReviewModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && text.trim().length > 0 && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    const result = await addReview(name, rating, text, photo)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <h3 className="text-white font-bold">Add Review</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              Client Name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John D."
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
              Rating
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          {/* Review text */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              Review Text
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the review text here…"
              rows={4}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600 resize-none"
            />
          </div>

          {/* Photo URL (optional) */}
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
              Profile Photo URL <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              value={photo}
              onChange={e => setPhoto(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Review
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setReviews(data as Review[])
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return
    setDeletingId(id)
    await deleteReview(id)
    setReviews(r => r.filter(x => x.id !== id))
    setDeletingId(null)
  }

  return (
    <>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Reviews Carousel</h2>
              <p className="text-gray-400 text-sm">Shown as an animated slider on the homepage</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Add Review
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-white/10 rounded-xl">
            <Star className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No reviews yet. Add your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="flex items-start gap-4 bg-black border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                {/* Avatar */}
                {r.author_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.author_photo_url} alt={r.author_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-500 font-bold text-xs flex-shrink-0 mt-0.5">
                    {r.author_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">{r.author_name}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-3 h-3 ${i <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700 fill-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">{r.text}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="flex-shrink-0 p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === r.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AddReviewModal
          onClose={() => setShowModal(false)}
          onAdded={fetchReviews}
        />
      )}
    </>
  )
}
