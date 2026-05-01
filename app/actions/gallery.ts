'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type GalleryImage = {
  id: string
  title: string
  image_url: string
  sort_order: number
  active: boolean
  created_at: string
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gallery')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  return (data as GalleryImage[]) || []
}

export async function getAllGalleryImages(): Promise<GalleryImage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gallery')
    .select('*')
    .order('sort_order')
  return (data as GalleryImage[]) || []
}

export async function addGalleryImage(title: string, imageUrl: string, sortOrder: number) {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    title: z.string().min(1).max(200),
    imageUrl: z.string().url(),
    sortOrder: z.number().int(),
  }).safeParse({ title, imageUrl, sortOrder })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('gallery')
    .insert({ title: parsed.data.title, image_url: parsed.data.imageUrl, sort_order: parsed.data.sortOrder })
  if (error) return { error: error.message }
  revalidatePath('/')
  return { error: null }
}

export async function updateGalleryImage(
  id: string,
  title: string,
  active: boolean,
  sortOrder: number,
) {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    active: z.boolean(),
    sortOrder: z.number().int(),
  }).safeParse({ id, title, active, sortOrder })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('gallery')
    .update({ title: parsed.data.title, active: parsed.data.active, sort_order: parsed.data.sortOrder })
    .eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { error: null }
}

export async function deleteGalleryImage(id: string, imageUrl: string) {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    imageUrl: z.string(),
  }).safeParse({ id, imageUrl })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const marker = '/storage/v1/object/public/gallery/'
  const idx = parsed.data.imageUrl.indexOf(marker)
  if (idx !== -1) {
    const path = decodeURIComponent(parsed.data.imageUrl.slice(idx + marker.length))
    await supabase.storage.from('gallery').remove([path])
  }
  const { error } = await supabase.from('gallery').delete().eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { error: null }
}
