const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-reviews-table.mjs <token>'); process.exit(1) }

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

console.log('\n⭐  Creating reviews table...\n')

await run(`
  CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_name text NOT NULL,
    rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    text text NOT NULL,
    author_photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  );
`, 'CREATE TABLE reviews')

await run(`ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;`, 'ENABLE RLS')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Anyone can read reviews') THEN
      CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
    END IF;
  END $$;
`, 'POLICY — public read')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Admins manage reviews') THEN
      CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
        USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin manage')

console.log('\n✅ Done.\n')
