import { updateSession } from '@/lib/supabase/proxy'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://images.unsplash.com https://${SUPABASE_HOST} https://api.dicebear.com`,
    "font-src 'self' data:",
    `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
    "frame-src https://www.google.com https://maps.google.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
}

export default async function middleware(request: NextRequest) {
  // Per-request nonce — btoa+randomUUID is Edge-runtime safe
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce)

  // Pass nonce as request header so Next.js injects it into its inline scripts
  const response = await updateSession(request, { 'x-nonce': nonce })
  response.headers.set('Content-Security-Policy', csp)

  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/?auth=login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
