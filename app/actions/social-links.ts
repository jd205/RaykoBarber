'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type SocialLink = {
  id: string
  platform: string
  label: string
  url: string
  active: boolean
  sort_order: number
  created_at: string
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('social_links')
    .select('*')
    .order('sort_order', { ascending: true })
  return data ?? []
}

export type ActiveSocialLink = Pick<SocialLink, 'id' | 'platform' | 'label' | 'url'>

export async function getActiveSocialLinks(): Promise<ActiveSocialLink[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('social_links')
    .select('id, platform, label, url')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  return data ?? []
}

const socialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  url: z.string().url().max(500).refine(s => s.startsWith('https://'), 'URL must use HTTPS'),
})

export async function createSocialLink(
  platform: string,
  label: string,
  url: string,
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = socialLinkSchema.safeParse({ platform, label, url })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('social_links')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
  const { error } = await supabase.from('social_links').insert({
    platform: parsed.data.platform,
    label: parsed.data.label.trim(),
    url: parsed.data.url.trim(),
    sort_order: nextOrder,
  })
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function updateSocialLink(
  id: string,
  label: string,
  url: string,
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(100),
    url: z.string().url().max(500).refine(s => s.startsWith('https://'), 'URL must use HTTPS'),
  }).safeParse({ id, label, url })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('social_links')
    .update({ label: parsed.data.label.trim(), url: parsed.data.url.trim() })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function toggleSocialLink(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse({ id, active })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('social_links')
    .update({ active: parsed.data.active })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}

export async function deleteSocialLink(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { error: 'Invalid ID' }

  const supabase = await createClient()
  const { error } = await supabase.from('social_links').delete().eq('id', parsed.data)
  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}

export async function reorderSocialLink(
  id: string,
  direction: 'up' | 'down',
  currentOrder: number,
  siblingId: string,
  siblingOrder: number,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    direction: z.enum(['up', 'down']),
    currentOrder: z.number().int(),
    siblingId: z.string().uuid(),
    siblingOrder: z.number().int(),
  }).safeParse({ id, direction, currentOrder, siblingId, siblingOrder })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error: e1 } = await supabase
    .from('social_links')
    .update({ sort_order: parsed.data.siblingOrder })
    .eq('id', parsed.data.id)
  const { error: e2 } = await supabase
    .from('social_links')
    .update({ sort_order: parsed.data.currentOrder })
    .eq('id', parsed.data.siblingId)
  if (e1 || e2) return { error: e1?.message ?? e2?.message }
  revalidatePath('/')
  return {}
}
