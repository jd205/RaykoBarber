'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
  description: string | null
  active: boolean
  sort_order: number
  created_at: string
}

export type Barber = {
  id: string
  name: string
  bio: string | null
  photo_url: string | null
  active: boolean
  sort_order: number
  created_at: string
}

/* ─── Services ─────────────────────────────────────── */

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().nonnegative().max(10000),
  durationMinutes: z.number().int().positive().max(480),
  description: z.string().max(500).optional(),
})

export async function createService(
  name: string, price: number, durationMinutes: number, description: string
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = serviceSchema.safeParse({ name, price, durationMinutes, description })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: maxRow } = await supabase.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sortOrder = (maxRow?.sort_order ?? 0) + 10
  const { error } = await supabase.from('services').insert({
    name: parsed.data.name.trim(), price: parsed.data.price, duration_minutes: parsed.data.durationMinutes,
    description: parsed.data.description?.trim() || null, sort_order: sortOrder,
  })
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}

export async function updateService(
  id: string, name: string, price: number, durationMinutes: number, description: string, active: boolean
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    ...serviceSchema.shape,
    active: z.boolean(),
  }).safeParse({ id, name, price, durationMinutes, description, active })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('services').update({
    name: parsed.data.name.trim(), price: parsed.data.price, duration_minutes: parsed.data.durationMinutes,
    description: parsed.data.description?.trim() || null, active: parsed.data.active,
  }).eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}

export async function deleteService(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { error: 'Invalid service ID' }

  const supabase = await createClient()
  const { error } = await supabase.from('services').delete().eq('id', parsed.data)
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}

/* ─── Barbers ──────────────────────────────────────── */

const barberSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
})

export async function createBarber(
  name: string, bio: string, photoUrl: string
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = barberSchema.safeParse({ name, bio, photoUrl })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: maxRow } = await supabase.from('barbers').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sortOrder = (maxRow?.sort_order ?? 0) + 10
  const { error } = await supabase.from('barbers').insert({
    name: parsed.data.name.trim(), bio: parsed.data.bio?.trim() || null,
    photo_url: parsed.data.photoUrl?.trim() || null, sort_order: sortOrder,
  })
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}

export async function updateBarber(
  id: string, name: string, bio: string, photoUrl: string, active: boolean
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    id: z.string().uuid(),
    ...barberSchema.shape,
    active: z.boolean(),
  }).safeParse({ id, name, bio, photoUrl, active })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('barbers').update({
    name: parsed.data.name.trim(), bio: parsed.data.bio?.trim() || null,
    photo_url: parsed.data.photoUrl?.trim() || null, active: parsed.data.active,
  }).eq('id', parsed.data.id)
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}

export async function deleteBarber(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { error: 'Invalid barber ID' }

  const supabase = await createClient()
  const { error } = await supabase.from('barbers').delete().eq('id', parsed.data)
  if (error) return { error: error.message }
  revalidatePath('/'); revalidatePath('/booking')
  return {}
}
