const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/create-barber-photos-bucket.mjs <token>'); process.exit(1) }

const REF = 'lkoqwhqdtnfjoxwfuuyv'

async function createBucket() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/storage/buckets`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'barber-photos', name: 'barber-photos', public: true }),
  })
  const d = await res.json()
  if (!res.ok) {
    if (d.error === 'Duplicate') { console.log('  ✓ Bucket barber-photos already exists'); return }
    throw new Error(d.message || JSON.stringify(d))
  }
  console.log('  ✓ Created public bucket: barber-photos')
}

async function setStoragePolicy() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        -- Allow admins to upload/delete barber photos
        INSERT INTO storage.policies (name, bucket_id, operation, definition)
        VALUES
          ('Admins can upload barber photos', 'barber-photos', 'INSERT', 'public.is_admin()'),
          ('Admins can delete barber photos', 'barber-photos', 'DELETE', 'public.is_admin()'),
          ('Anyone can view barber photos', 'barber-photos', 'SELECT', 'true')
        ON CONFLICT DO NOTHING;
      `
    }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.message || JSON.stringify(d))
  console.log('  ✓ Storage policies applied')
}

console.log('\n📸  Setting up barber-photos storage bucket...\n')
await createBucket()
await setStoragePolicy()
console.log('\nDone. Admins can now upload barber photos from the dashboard.\n')
