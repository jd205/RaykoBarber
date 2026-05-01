const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-social-links-table.mjs <token>'); process.exit(1) }

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

console.log('\n🔗  Creating social_links table...\n')

await run(`
  CREATE TABLE IF NOT EXISTS public.social_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  );
`, 'CREATE TABLE social_links')

await run(`
  ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
`, 'ENABLE ROW LEVEL SECURITY')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'social_links' AND policyname = 'Anyone can read social links'
    ) THEN
      CREATE POLICY "Anyone can read social links"
        ON public.social_links FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END $$;
`, 'POLICY — public read')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'social_links' AND policyname = 'Admins can insert social links'
    ) THEN
      CREATE POLICY "Admins can insert social links"
        ON public.social_links FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin insert')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'social_links' AND policyname = 'Admins can update social links'
    ) THEN
      CREATE POLICY "Admins can update social links"
        ON public.social_links FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin update')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'social_links' AND policyname = 'Admins can delete social links'
    ) THEN
      CREATE POLICY "Admins can delete social links"
        ON public.social_links FOR DELETE
        TO authenticated
        USING (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin delete')

console.log('\n✅ Done. Go to Admin → Settings to add your social links.\n')
