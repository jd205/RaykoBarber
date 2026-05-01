const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-notes-column.mjs <token>'); process.exit(1) }

const REF = 'lkoqwhqdtnfjoxwfuuyv'
const URL = 'https://api.supabase.com/v1/projects/' + REF + '/database/query'

async function run(query, label) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.message || JSON.stringify(d))
  console.log('  ✓', label)
}

console.log('\n🔌 Adding notes column to appointments...\n')
await run(
  "ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notes text;",
  "ALTER TABLE appointments — ADD COLUMN notes"
)
console.log('\n✅ Done.\n')
