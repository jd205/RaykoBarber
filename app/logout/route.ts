import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: CSRF-safe sign-out
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}

// GET: redirect without signing out — prevents CSRF logout via img/link prefetch
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url))
}
