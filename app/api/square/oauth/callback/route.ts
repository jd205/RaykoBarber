import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SquareClient, SquareEnvironment } from 'square'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const CLIENT_ID = process.env.SQUARE_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.SQUARE_CLIENT_SECRET ?? ''
const REDIRECT_URI = `${SITE_URL}/api/square/oauth/callback`

function errRedirect(code: string) {
  return NextResponse.redirect(`${SITE_URL}/dashboard?sq_error=${code}`)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError) return errRedirect(encodeURIComponent(oauthError))
  if (!code || !state) return errRedirect('missing_params')

  // CSRF: verify state matches the cookie set during initiateSquareOAuth
  const cookieStore = await cookies()
  const savedState = cookieStore.get('sq_oauth_state')?.value
  cookieStore.delete('sq_oauth_state')

  if (!savedState || savedState !== state) return errRedirect('state_mismatch')

  const isSandbox = (process.env.SQUARE_ENVIRONMENT ?? 'sandbox') !== 'production'
  const environment = isSandbox ? SquareEnvironment.Sandbox : SquareEnvironment.Production

  try {
    // Exchange authorization code for tokens
    // Empty token is fine here — obtainToken authenticates via clientId + clientSecret in body
    const tempClient = new SquareClient({ token: '', environment })
    const tokenResponse = await tempClient.oAuth.obtainToken({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      code,
      grantType: 'authorization_code',
      redirectUri: REDIRECT_URI,
    })

    if (!tokenResponse?.accessToken || !tokenResponse?.refreshToken) {
      return errRedirect('token_exchange_failed')
    }

    const { accessToken, refreshToken, expiresAt } = tokenResponse

    // Fetch merchant profile and primary location using the new token
    const authedClient = new SquareClient({ token: accessToken, environment })

    const [merchantRes, locationsRes] = await Promise.all([
      authedClient.merchants.get({ merchantId: 'me' }),
      authedClient.locations.list(),
    ])

    const merchant = merchantRes.merchant
    const primaryLocation =
      locationsRes.locations?.find(l => l.status === 'ACTIVE') ??
      locationsRes.locations?.[0]

    // Derive the Web Payments SDK app ID from the OAuth client ID.
    // OAuth uses sq0idp-SUFFIX in both envs; the sandbox SDK needs sandbox-sq0idb-SUFFIX.
    const suffix = CLIENT_ID.replace(/^sq0idp-/, '')
    const sdkAppId = isSandbox ? `sandbox-sq0idb-${suffix}` : CLIENT_ID

    // Persist all credentials to the singleton row
    const supabase = await createClient()
    const { error: dbError } = await supabase
      .from('square_oauth_credentials')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        merchant_id: merchant?.id ?? null,
        merchant_name: merchant?.businessName ?? merchant?.id ?? null,
        location_id: primaryLocation?.id ?? null,
        app_id: sdkAppId,
        environment: isSandbox ? 'sandbox' : 'production',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (dbError) return errRedirect('db_write_failed')

    return NextResponse.redirect(`${SITE_URL}/dashboard?sq_connected=1`)
  } catch {
    return errRedirect('unexpected')
  }
}
