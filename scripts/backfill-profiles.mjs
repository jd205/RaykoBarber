import { fileURLToPath } from 'url'

const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/backfill-profiles.mjs <token>'); process.exit(1) }

const REF = 'lkoqwhqdtnfjoxwfuuyv'
const URL = 'https://api.supabase.com/v1/projects/' + REF + '/database/query'

const sql = [
  "INSERT INTO public.profiles (id, full_name, email, role)",
  "SELECT",
  "  u.id,",
  "  u.raw_user_meta_data->>'full_name',",
  "  u.email,",
  "  CASE WHEN u.email = 'medinajd205@gmail.com' THEN 'admin' ELSE 'client' END",
  "FROM auth.users u",
  "ON CONFLICT (id) DO UPDATE",
  "  SET full_name = EXCLUDED.full_name,",
  "      email     = EXCLUDED.email,",
  "      role      = EXCLUDED.role;"
].join('\n')

const res = await fetch(URL, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const data = await res.json()

if (!res.ok || data.message) {
  console.error('Error:', data.message || JSON.stringify(data))
  process.exit(1)
}

// Count rows inserted/updated
const verifyRes = await fetch(URL, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: "SELECT id, full_name, email, role FROM public.profiles ORDER BY created_at;" }),
})
const verifyData = await verifyRes.json()

console.log('\n✅ Backfill complete. Profiles in DB:')
if (Array.isArray(verifyData)) {
  verifyData.forEach(p => {
    console.log('  -', p.email || '(no email)', '|', p.full_name || '(no name)', '|', p.role)
  })
} else {
  console.log(JSON.stringify(verifyData, null, 2))
}
