const TOKEN = process.argv[2]
if (!TOKEN) { console.error('Usage: node scripts/add-services-barbers-tables.mjs <token>'); process.exit(1) }

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

console.log('\n✂️  Creating services & barbers tables...\n')

/* ─── services ─────────────────────────────────────── */
await run(`
  CREATE TABLE IF NOT EXISTS public.services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    duration_minutes int NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    sort_order int DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  );
`, 'CREATE TABLE services')

await run(`ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;`, 'RLS services')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='Anyone can read services') THEN
      CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
    END IF;
  END $$;
`, 'POLICY — public read services')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='Admins manage services') THEN
      CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated
        USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin manage services')

/* ─── seed services ─────────────────────────────────── */
await run(`
  INSERT INTO public.services (name, price, duration_minutes, description, sort_order) VALUES
    ('Traditional Haircut',             33.00, 35,  NULL,                      10),
    ('Haircut & Beard Combo',           55.00, 50,  NULL,                      20),
    ('Skin Fade / Taper Fade',          37.00, 40,  NULL,                      30),
    ('High School Skin Fade / Taper',   32.00, 35,  NULL,                      40),
    ('Young Gents',                     30.00, 30,  '13 years – High school.', 50),
    ('Kids Skin Fade',                  30.00, 25,  '12 years and under.',     60),
    ('Kids Traditional',                26.00, 25,  '12 years and under.',     70),
    ('Scalp Massage',                   25.00, 25,  NULL,                      80),
    ('Fairy Hair Tinsel',               15.00, 15,  'Start at $15 · 30 units', 90),
    ('Braiding Service',                40.00, 60,  'Start at $40',            100),
    ('Head Razor Shave',                30.00, 30,  NULL,                      110),
    ('Senior Haircut',                  25.00, 20,  NULL,                      120)
  ON CONFLICT DO NOTHING;
`, 'SEED services (12 rows)')

/* ─── barbers ───────────────────────────────────────── */
await run(`
  CREATE TABLE IF NOT EXISTS public.barbers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    bio text,
    photo_url text,
    active boolean DEFAULT true NOT NULL,
    sort_order int DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
  );
`, 'CREATE TABLE barbers')

await run(`ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;`, 'RLS barbers')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbers' AND policyname='Anyone can read barbers') THEN
      CREATE POLICY "Anyone can read barbers" ON public.barbers FOR SELECT USING (true);
    END IF;
  END $$;
`, 'POLICY — public read barbers')

await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbers' AND policyname='Admins manage barbers') THEN
      CREATE POLICY "Admins manage barbers" ON public.barbers FOR ALL TO authenticated
        USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
  END $$;
`, 'POLICY — admin manage barbers')

console.log('\n✅ Done.\n')
