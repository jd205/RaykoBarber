'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createSocialLink,
  deleteSocialLink,
  toggleSocialLink,
  updateSocialLink,
  reorderSocialLink,
} from '@/app/actions/social-links'
import { SocialIcon, PLATFORMS, getPlatform } from '@/lib/social-platforms'
import {
  Plus, Trash2, Loader2, CheckCircle2, Eye, EyeOff,
  ChevronUp, ChevronDown, Pencil, X, Share2,
} from 'lucide-react'

type SocialLink = {
  id: string
  platform: string
  label: string
  url: string
  active: boolean
  sort_order: number
}

type EditState = { label: string; url: string }

export function SocialLinksManager() {
  const [links, setLinks] = useState<SocialLink[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ platform: 'instagram', label: 'Instagram', url: '' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ label: '', url: '' })
  const [error, setError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLinks = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('social_links')
      .select('*')
      .order('sort_order', { ascending: true })
    if (dbError) {
      setFetchError(dbError.message)
    } else {
      setFetchError(null)
      setLinks(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  async function handleAdd() {
    if (!form.url.trim()) return
    setSaving(true)
    setError(null)
    const result = await createSocialLink(form.platform, form.label, form.url)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setForm({ platform: 'instagram', label: 'Instagram', url: '' })
    setAdding(false)
    fetchLinks()
  }

  async function handleToggle(id: string, active: boolean) {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, active } : l))
    await toggleSocialLink(id, active)
  }

  async function handleDelete(id: string) {
    setLinks(prev => prev.filter(l => l.id !== id))
    await deleteSocialLink(id)
  }

  function startEdit(link: SocialLink) {
    setEditingId(link.id)
    setEditState({ label: link.label, url: link.url })
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    const result = await updateSocialLink(id, editState.label, editState.url)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setEditingId(null)
    setLinks(prev => prev.map(l =>
      l.id === id ? { ...l, label: editState.label, url: editState.url } : l
    ))
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    const siblingIndex = direction === 'up' ? index - 1 : index + 1
    if (siblingIndex < 0 || siblingIndex >= links.length) return

    const link = links[index]
    const sibling = links[siblingIndex]
    const newLinks = [...links]
    newLinks[index] = { ...sibling, sort_order: link.sort_order }
    newLinks[siblingIndex] = { ...link, sort_order: sibling.sort_order }
    newLinks.sort((a, b) => a.sort_order - b.sort_order)
    setLinks(newLinks)

    await reorderSocialLink(link.id, direction, link.sort_order, sibling.id, sibling.sort_order)
  }

  function handlePlatformChange(platform: string) {
    const p = getPlatform(platform)
    setForm(f => ({ ...f, platform, label: p.label }))
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
            <Share2 className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Social Networks</h2>
            <p className="text-gray-400 text-sm">Links shown in the homepage footer</p>
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Network
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-black border border-yellow-500/20 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">New Social Network</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Platform</label>
              <select
                value={form.platform}
                onChange={e => handlePlatformChange(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Label</label>
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Display name"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">URL</label>
            <input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder={getPlatform(form.platform).placeholder}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setAdding(false); setError(null) }}
              className="flex items-center gap-1.5 px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !form.url.trim()}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Links list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
      ) : fetchError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-4 text-sm space-y-2">
          <p className="text-red-400 font-semibold">Database error</p>
          <p className="text-gray-400 font-mono text-xs break-all">{fetchError}</p>
        </div>
      ) : links.length === 0 ? (
        <p className="text-center text-gray-600 py-8 text-sm">
          No social networks yet. Click &quot;Add Network&quot; to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => {
            const platform = getPlatform(link.platform)
            const isEditing = editingId === link.id

            return (
              <div
                key={link.id}
                className={`rounded-xl border transition-all ${
                  link.active
                    ? 'bg-black border-white/10'
                    : 'bg-black border-white/5 opacity-50'
                }`}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: platform.color + '25', color: platform.color }}
                      >
                        <SocialIcon platform={link.platform} size={14} />
                      </div>
                      <span className="text-white text-sm font-medium">{platform.label}</span>
                    </div>
                    <input
                      value={editState.label}
                      onChange={e => setEditState(s => ({ ...s, label: e.target.value }))}
                      placeholder="Label"
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                    <input
                      value={editState.url}
                      onChange={e => setEditState(s => ({ ...s, url: e.target.value }))}
                      placeholder="URL"
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(link.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-600 hover:text-gray-400 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === links.length - 1}
                        className="text-gray-600 hover:text-gray-400 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: platform.color + '20', color: platform.color }}
                    >
                      <SocialIcon platform={link.platform} size={16} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{link.label}</p>
                      <p className="text-gray-500 text-xs truncate">{link.url}</p>
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(link)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggle(link.id, !link.active)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        link.active
                          ? 'text-green-400 hover:text-green-300 hover:bg-green-400/10'
                          : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                      }`}
                      title={link.active ? 'Deactivate' : 'Activate'}
                    >
                      {link.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {links.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          {links.filter(l => l.active).length} active · {links.filter(l => !l.active).length} hidden
        </p>
      )}
    </div>
  )
}
