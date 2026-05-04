'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const CLIENT_ID = process.env.SQUARE_CLIENT_ID ?? ''
const REDIRECT_URI = `${SITE_URL}/api/square/oauth/callback`
const SCOPES = 'PAYMENTS_WRITE PAYMENTS_READ MERCHANT_PROFILE_READ ITEMS_READ ITEMS_WRITE APPOINTMENTS_WRITE APPOINTMENTS_READ TEAM_MEMBERS_READ'

export type SquareConnectionStatus = {
  connected: boolean
  merchantName: string | null
  merchantId: string | null
  locationId: string | null
  appId: string | null
  connectedAt: string | null
  tokenExpiresAt: string | null
}

const DISCONNECTED: SquareConnectionStatus = {
  connected: false,
  merchantName: null,
  merchantId: null,
  locationId: null,
  appId: null,
  connectedAt: null,
  tokenExpiresAt: null,
}

export async function getSquareConnectionStatus(): Promise<SquareConnectionStatus> {
  const admin = await requireAdmin()
  if ('error' in admin) return DISCONNECTED

  const supabase = await createClient()
  const { data } = await supabase
    .from('square_oauth_credentials')
    .select('access_token, merchant_name, merchant_id, location_id, app_id, connected_at, token_expires_at')
    .eq('id', 1)
    .single()

  return {
    connected: !!data?.access_token,
    merchantName: data?.merchant_name ?? null,
    merchantId: data?.merchant_id ?? null,
    locationId: data?.location_id ?? null,
    appId: data?.app_id ?? null,
    connectedAt: data?.connected_at ?? null,
    tokenExpiresAt: data?.token_expires_at ?? null,
  }
}

export async function initiateSquareOAuth(): Promise<never> {
  const admin = await requireAdmin()
  if ('error' in admin) redirect('/dashboard')

  // CSRF: generate state, store in short-lived httpOnly cookie
  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('sq_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const isSandbox = (process.env.SQUARE_ENVIRONMENT ?? 'sandbox') !== 'production'
  const baseUrl = isSandbox
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com'

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  })

  redirect(`${baseUrl}/oauth2/authorize?${params}`)
}

export async function disconnectSquare(): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('square_oauth_credentials')
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      merchant_id: null,
      merchant_name: null,
      location_id: null,
      app_id: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) return { error: error.message }
  return { success: true }
}
