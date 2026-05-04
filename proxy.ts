import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co'

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  // Square CDN differs between sandbox and production
  const squareCdn = isDev
    ? 'https://sandbox.web.squarecdn.com'
    : 'https://web.squarecdn.com'
  const squarePci = isDev
    ? 'https://pci-connect.squareupsandbox.com'
    : 'https://pci-connect.squareup.com'

  return [
    "default-src 'self'",
    // squareCdn added as CSP2 host allowlist fallback; strict-dynamic covers modern browsers
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' ${squareCdn}`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${squareCdn}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://images.unsplash.com https://${SUPABASE_HOST} https://api.dicebear.com`,
    `font-src 'self' data: https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net`,
    `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} ${squareCdn} ${squarePci} https://o160250.ingest.sentry.io`,
    `frame-src https://www.google.com https://maps.google.com ${squareCdn}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ')
}

export default async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  supabaseResponse.headers.set('Content-Security-Policy', csp)

  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/?auth=login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
