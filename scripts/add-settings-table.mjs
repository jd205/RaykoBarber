const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-settings-table.mjs <token>'); process.exit(1) }

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

console.log('\n🗺️  Creating barbershop_settings table...\n')

await run(`
  CREATE TABLE IF NOT EXISTS public.barbershop_settings (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    address text NOT NULL DEFAULT '123 Main Street, New York, NY 10001',
    map_embed_url text,
    updated_at timestamp with time zone DEFAULT now()
  );
`, 'CREATE TABLE barbershop_settings')

await run(`
  ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;
`, 'ENABLE ROW LEVEL SECURITY')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'barbershop_settings' AND policyname = 'Anyone can read settings'
    ) THEN
      CREATE POLICY "Anyone can read settings"
        ON public.barbershop_settings FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END $$;
`, 'POLICY — public read')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'barbershop_settings' AND policyname = 'Admins can update settings'
    ) THEN
      CREATE POLICY "Admins can update settings"
        ON public.barbershop_settings FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin update')

await run(`
  INSERT INTO public.barbershop_settings (id, address)
  VALUES (1, '123 Main Street, New York, NY 10001')
  ON CONFLICT (id) DO NOTHING;
`, 'INSERT default row')

console.log('\n✅ Done. Run the app and update the address from the admin Settings tab.\n')
