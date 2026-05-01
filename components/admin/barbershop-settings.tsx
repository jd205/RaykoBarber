'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateBarbershopSettings, updateHeroImageUrl } from '@/app/actions/settings'
import { MapPin, Save, Loader2, CheckCircle2, ExternalLink, RefreshCw, Star, ImageIcon, Upload, X } from 'lucide-react'
import { ReviewsManager } from '@/components/admin/reviews-manager'
import { SocialLinksManager } from '@/components/admin/social-links-manager'

type Settings = {
  address: string
  map_embed_url: string
  google_maps_url: string
  hero_image_url: string
}

const DEFAULT_ADDRESS = '123 Main Street, New York, NY 10001'

export function BarbershopSettings() {
  const [settings, setSettings] = useState<Settings>({
    address: DEFAULT_ADDRESS,
    map_embed_url: '',
    google_maps_url: '',
    hero_image_url: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroSaving, setHeroSaving] = useState(false)
  const [heroSaved, setHeroSaved] = useState(false)
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null)
  const [heroLocalPreview, setHeroLocalPreview] = useState<string | null>(null)
  const [heroUrlDraft, setHeroUrlDraft] = useState('')
  const heroFileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('barbershop_settings')
        .select('address, map_embed_url, google_maps_url, hero_image_url')
        .single()
      if (data) {
        setSettings({
          address: data.address || DEFAULT_ADDRESS,
          map_embed_url: data.map_embed_url || '',
          google_maps_url: data.google_maps_url || '',
          hero_image_url: data.hero_image_url || '',
        })
        setHeroUrlDraft(data.hero_image_url || '')
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    if (!settings.address.trim()) return
    setSaving(true)
    setError(null)
    const result = await updateBarbershopSettings(
      settings.address,
      settings.map_embed_url,
      settings.google_maps_url,
    )
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
    setPreviewKey(k => k + 1)
    setTimeout(() => setSaved(false), 2500)
  }

  const applyHeroSuccess = (url: string) => {
    setSettings(s => ({ ...s, hero_image_url: url }))
    setHeroUrlDraft(url)
    setHeroSaved(true)
    setTimeout(() => setHeroSaved(false), 3000)
  }

  const handleHeroFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setHeroUploadError(null)
    setHeroLocalPreview(URL.createObjectURL(file))
    setHeroUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `hero-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('hero-images')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadErr) throw new Error(uploadErr.message)
      const { data: { publicUrl } } = supabase.storage.from('hero-images').getPublicUrl(path)
      const saveResult = await updateHeroImageUrl(publicUrl)
      if (saveResult.error) throw new Error(saveResult.error)
      applyHeroSuccess(publicUrl)
    } catch (e: unknown) {
      setHeroUploadError(e instanceof Error ? e.message : 'Upload failed')
      setHeroLocalPreview(null)
    } finally {
      setHeroUploading(false)
      if (heroFileInputRef.current) heroFileInputRef.current.value = ''
    }
  }

  const handleHeroUrlSave = async () => {
    setHeroSaving(true)
    setHeroUploadError(null)
    const result = await updateHeroImageUrl(heroUrlDraft)
    setHeroSaving(false)
    if (result.error) { setHeroUploadError(result.error); return }
    setHeroLocalPreview(null)
    applyHeroSuccess(heroUrlDraft)
  }

  const handleHeroClear = async () => {
    setHeroLocalPreview(null)
    setHeroUrlDraft('')
    setHeroUploadError(null)
    setSettings(s => ({ ...s, hero_image_url: '' }))
    await updateHeroImageUrl('')
  }

  const previewSrc =
    settings.map_embed_url.trim() ||
    `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Hero banner section ── */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
              <ImageIcon className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Hero Banner Image</h2>
              <p className="text-gray-400 text-sm">Background image shown on the homepage hero section</p>
            </div>
          </div>
          {heroSaved && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Applied to homepage
            </span>
          )}
        </div>

        {/* Upload area — auto-saves on file select */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
            Upload from device <span className="text-gray-600 normal-case font-normal">(saves automatically)</span>
          </p>
          <div
            onClick={() => !heroUploading && heroFileInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleHeroFileSelect(f) }}
            onDragOver={e => e.preventDefault()}
            className="relative cursor-pointer border-2 border-dashed border-white/15 hover:border-yellow-500/50 rounded-xl transition-colors overflow-hidden"
          >
            {(heroLocalPreview || settings.hero_image_url) ? (
              <div
                className="h-44 bg-cover bg-center relative"
                style={{ backgroundImage: `url("${heroLocalPreview || settings.hero_image_url}")` }}
              >
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                  {heroUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                      <p className="text-white text-xs font-medium">Uploading & saving…</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-white/70" />
                      <p className="text-white/70 text-xs">Click or drag to replace</p>
                    </>
                  )}
                </div>
                {!heroUploading && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleHeroClear() }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="h-36 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Upload className="w-8 h-8" />
                <div className="text-center">
                  <p className="text-sm">Click or drag an image here</p>
                  <p className="text-xs mt-1">JPG, PNG, WEBP, AVIF · any size</p>
                </div>
              </div>
            )}
            <input
              ref={heroFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleHeroFileSelect(f) }}
            />
          </div>
          {heroUploadError && (
            <p className="text-red-400 text-xs mt-1.5">{heroUploadError}</p>
          )}
        </div>

        {/* External URL with its own Apply button */}
        <div>
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Or paste an external URL
          </label>
          <div className="flex gap-2">
            <input
              value={heroUrlDraft}
              onChange={e => setHeroUrlDraft(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
            <button
              onClick={handleHeroUrlSave}
              disabled={heroSaving || heroUploading || heroUrlDraft === settings.hero_image_url}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 text-sm whitespace-nowrap"
            >
              {heroSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Apply
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-1.5">Leave blank to restore the default image.</p>
        </div>
      </div>

      {/* ── Map section ── */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
            <MapPin className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Barbershop Location</h2>
            <p className="text-gray-400 text-sm">Address and map shown on the public homepage</p>
          </div>
        </div>

        {/* Map preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Map Preview</p>
            <button
              onClick={() => setPreviewKey(k => k + 1)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black" style={{ height: 280 }}>
            <iframe
              key={previewKey}
              src={previewSrc}
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map preview"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Address
          </label>
          <input
            value={settings.address}
            onChange={e => setSettings(s => ({ ...s, address: e.target.value }))}
            placeholder="123 Main Street, New York, NY 10001"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
          />
        </div>

        {/* Custom embed URL */}
        <div>
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Custom Embed URL{' '}
            <span className="text-gray-600 normal-case font-normal">(optional)</span>
          </label>
          <input
            value={settings.map_embed_url}
            onChange={e => setSettings(s => ({ ...s, map_embed_url: e.target.value }))}
            placeholder="https://www.google.com/maps/embed?pb=..."
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
          />
          <div className="flex items-start gap-1.5 mt-1.5">
            <ExternalLink className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-xs">
              Google Maps → Share → Embed a map → copy the{' '}
              <code className="text-gray-500 bg-white/5 px-1 rounded">src</code> from the iframe
            </p>
          </div>
        </div>
      </div>

      {/* ── Reviews link section ── */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Google Reviews Link</h2>
            <p className="text-gray-400 text-sm">Shown as a "View All Reviews" button on the homepage</p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wider">
            Google Maps URL (your business page)
          </label>
          <input
            value={settings.google_maps_url}
            onChange={e => setSettings(s => ({ ...s, google_maps_url: e.target.value }))}
            placeholder="https://www.google.com/maps/place/Your+Barbershop/..."
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
          />
          <div className="flex items-start gap-1.5 mt-1.5">
            <ExternalLink className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600 text-xs">
              Paste the full URL from Google Maps for your business. Customers will be taken there to read all reviews.
            </p>
          </div>
        </div>

        {/* Preview link */}
        {settings.google_maps_url.trim() && (
          <a
            href={settings.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 text-sm transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Preview link
          </a>
        )}
      </div>

      {/* ── Reviews carousel section ── */}
      <ReviewsManager />

      {/* ── Social networks section ── */}
      <SocialLinksManager />

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !settings.address.trim()}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-40 text-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
        {saved && (
          <p className="text-green-400 text-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Homepage updated
          </p>
        )}
      </div>
    </div>
  )
}
