'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type BarbershopSettings = {
  id: number
  address: string
  map_embed_url: string | null
  google_maps_url: string | null
  hero_image_url: string | null
  updated_at: string
}

export type Review = {
  id: string
  author_name: string
  rating: number
  text: string
  author_photo_url: string | null
  created_at: string
}

const DEFAULT_ADDRESS = '123 Main Street, New York, NY 10001'

function isValidGoogleMapsEmbed(url: string) {
  return url === '' || url.startsWith('https://www.google.com/maps/embed')
}

function isValidGoogleMapsUrl(url: string) {
  if (url === '') return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return (
      url.startsWith('https://www.google.com/maps') ||
      url.startsWith('https://maps.google.com') ||
      url.startsWith('https://goo.gl/maps')
    )
  } catch {
    return false
  }
}

export async function getSettings(): Promise<BarbershopSettings> {
  const supabase = await createClient()
  const { data } = await supabase.from('barbershop_settings').select('*').single()
  return data ?? {
    id: 1,
    address: DEFAULT_ADDRESS,
    map_embed_url: null,
    google_maps_url: null,
    hero_image_url: null,
    updated_at: new Date().toISOString(),
  }
}

export async function updateBarbershopSettings(
  address: string,
  mapEmbedUrl: string,
  googleMapsUrl: string,
  heroImageUrl: string = '',
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    address: z.string().min(1).max(500),
    mapEmbedUrl: z.string().max(1000).refine(isValidGoogleMapsEmbed, 'Must be a valid Google Maps embed URL or empty'),
    googleMapsUrl: z.string().max(500).refine(isValidGoogleMapsUrl, 'Must be a valid Google Maps URL or empty'),
    heroImageUrl: z.string().max(500).optional().or(z.literal('')),
  }).safeParse({ address, mapEmbedUrl, googleMapsUrl, heroImageUrl })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('barbershop_settings')
    .update({
      address: parsed.data.address.trim(),
      map_embed_url: parsed.data.mapEmbedUrl.trim() || null,
      google_maps_url: parsed.data.googleMapsUrl.trim() || null,
      hero_image_url: parsed.data.heroImageUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateHeroImageUrl(
  url: string,
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().url().max(500).safeParse(url)
  if (!parsed.success) return { error: 'Invalid URL' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('barbershop_settings')
    .update({ hero_image_url: parsed.data.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function addReview(
  authorName: string,
  rating: number,
  text: string,
  authorPhotoUrl: string,
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    authorName: z.string().min(1).max(100),
    rating: z.number().int().min(1).max(5),
    text: z.string().min(1).max(1000),
    authorPhotoUrl: z.string().url().optional().or(z.literal('')),
  }).safeParse({ authorName, rating, text, authorPhotoUrl })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('reviews').insert({
    author_name: parsed.data.authorName.trim(),
    rating: parsed.data.rating,
    text: parsed.data.text.trim(),
    author_photo_url: parsed.data.authorPhotoUrl?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function deleteReview(id: string): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { error: 'Invalid review ID' }

  const supabase = await createClient()
  const { error } = await supabase.from('reviews').delete().eq('id', parsed.data)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}
