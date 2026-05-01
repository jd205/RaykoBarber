const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-attended-column.mjs <token>'); process.exit(1) }

const REF = 'lkoqwhqdtnfjoxwfuuyv'
const API = 'https://api.supabase.com/v1/projects/' + REF + '/database/query'

async function run(query, label) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.message || JSON.stringify(d))
  console.log('  ✓', label)
}

console.log('\n✂️  Adding attended column to appointments...\n')

await run(`
  ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT NULL;
`, 'ADD COLUMN attended (null=unmarked, true=showed up, false=no-show)')

console.log('\n✅  Done.\n')
