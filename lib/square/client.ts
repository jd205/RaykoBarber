import { SquareClient, SquareEnvironment } from 'square'
import { createClient } from '@/lib/supabase/server'

export async function getSquareClient(): Promise<SquareClient> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('square_oauth_credentials')
    .select('access_token, environment')
    .eq('id', 1)
    .single()

  // DB token takes precedence; env var is the backwards-compatible fallback
  const token = data?.access_token ?? process.env.SQUARE_ACCESS_TOKEN ?? ''
  const env = data?.environment === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox

  return new SquareClient({ token, environment: env })
}
