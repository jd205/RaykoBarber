const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-gallery-table.mjs <token>'); process.exit(1) }

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

console.log('\n🖼️  Setting up gallery table & storage bucket...\n')

await run(`
  CREATE TABLE IF NOT EXISTS public.gallery (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL DEFAULT '',
    image_url text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`, 'CREATE TABLE gallery')

await run(`ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;`, 'RLS gallery')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gallery' AND policyname='Public read gallery') THEN
      CREATE POLICY "Public read gallery" ON public.gallery FOR SELECT USING (active = true);
    END IF;
  END $$;
`, 'POLICY public read gallery')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gallery' AND policyname='Admin manage gallery') THEN
      CREATE POLICY "Admin manage gallery" ON public.gallery FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;
  END $$;
`, 'POLICY admin manage gallery')

/* ─── Storage bucket (via storage.buckets internal table) ─── */
await run(`
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('gallery', 'gallery', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
  ON CONFLICT (id) DO NOTHING;
`, 'CREATE STORAGE BUCKET gallery')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read gallery objects') THEN
      CREATE POLICY "Public read gallery objects" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
    END IF;
  END $$;
`, 'POLICY storage public read')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin upload gallery objects') THEN
      CREATE POLICY "Admin upload gallery objects" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND is_admin());
    END IF;
  END $$;
`, 'POLICY storage admin upload')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin delete gallery objects') THEN
      CREATE POLICY "Admin delete gallery objects" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND is_admin());
    END IF;
  END $$;
`, 'POLICY storage admin delete')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin update gallery objects') THEN
      CREATE POLICY "Admin update gallery objects" ON storage.objects FOR UPDATE USING (bucket_id = 'gallery' AND is_admin());
    END IF;
  END $$;
`, 'POLICY storage admin update')

console.log('\n✅  Gallery table & storage bucket ready.\n')
