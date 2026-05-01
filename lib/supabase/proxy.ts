import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Record<string, string>,
) {
  // Merge any extra headers (e.g. x-nonce for CSP) into the request so
  // Next.js server components can read them via headers().
  const mergedHeaders = extraRequestHeaders
    ? (() => {
        const h = new Headers(request.headers)
        for (const [k, v] of Object.entries(extraRequestHeaders)) h.set(k, v)
        return h
      })()
    : null

  function makeResponse() {
    return mergedHeaders
      ? NextResponse.next({ request: { headers: mergedHeaders } })
      : NextResponse.next({ request })
  }

  let supabaseResponse = makeResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = makeResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  await supabase.auth.getClaims()

  return supabaseResponse
}
