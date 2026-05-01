import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Missing required environment variables.')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPass  = process.env.SEED_ADMIN_PASSWORD
  const clientEmail = process.env.SEED_CLIENT_EMAIL
  const clientPass  = process.env.SEED_CLIENT_PASSWORD

  if (!adminEmail || !adminPass || !clientEmail || !clientPass) {
    console.error('ERROR: Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_CLIENT_EMAIL, SEED_CLIENT_PASSWORD')
    process.exit(1)
  }

  console.log('Seeding Admin User...')
  const { error: adminErr } = await supabase.auth.signUp({ email: adminEmail, password: adminPass })
  if (adminErr) console.log('Admin error (may already exist):', adminErr.message)
  else console.log('Admin created. Promote with: UPDATE public.profiles SET role=\'admin\' WHERE email=\'' + adminEmail + '\';')

  console.log('Seeding Client User...')
  const { error: clientErr } = await supabase.auth.signUp({ email: clientEmail, password: clientPass })
  if (clientErr) console.log('Client error (may already exist):', clientErr.message)
  else console.log('Client created successfully.')
}

seed()
