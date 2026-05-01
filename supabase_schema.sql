-- =============================================================
-- Complete Schema — Reyko Nakao Barbershop SaaS
-- Run this on a fresh Supabase project to recreate everything.
-- WARNING: Drops all existing tables — do NOT run on a live DB
--          with production data unless you have a backup.
-- =============================================================

-- ─── Drop existing tables (order matters for FK constraints) ──
DROP TABLE IF EXISTS public.social_links         CASCADE;
DROP TABLE IF EXISTS public.gallery              CASCADE;
DROP TABLE IF EXISTS public.barbershop_settings  CASCADE;
DROP TABLE IF EXISTS public.reviews              CASCADE;
DROP TABLE IF EXISTS public.barbers              CASCADE;
DROP TABLE IF EXISTS public.services             CASCADE;
DROP TABLE IF EXISTS public.notifications        CASCADE;
DROP TABLE IF EXISTS public.audit_logs           CASCADE;
DROP TABLE IF EXISTS public.appointments         CASCADE;
DROP TABLE IF EXISTS public.profiles             CASCADE;

-- ─── Helper: is_admin() ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- TABLES
-- =============================================================

-- ─── Profiles ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id           uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name    text,
  email        text,
  phone        text,
  avatar_url   text,
  role         text DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Appointments ─────────────────────────────────────────────
CREATE TABLE public.appointments (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_id       uuid NOT NULL,
  barber_id        uuid NOT NULL,
  appointment_date timestamp with time zone NOT NULL,
  status           text DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'cancelled', 'completed', 'rescheduled')),
  notes            text,
  attended         boolean,
  created_at       timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Audit Logs ───────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type           text NOT NULL CHECK (type IN ('new_booking', 'reschedule', 'cancellation')),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_name    text,
  message        text NOT NULL,
  read           boolean DEFAULT false,
  created_at     timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Services ─────────────────────────────────────────────────
CREATE TABLE public.services (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL,
  price            numeric(10, 2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  description      text,
  active           boolean DEFAULT true,
  sort_order       integer DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Barbers ──────────────────────────────────────────────────
CREATE TABLE public.barbers (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  bio        text,
  photo_url  text,
  active     boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Reviews ──────────────────────────────────────────────────
CREATE TABLE public.reviews (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name     text NOT NULL,
  rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text            text NOT NULL,
  author_photo_url text,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Gallery ──────────────────────────────────────────────────
CREATE TABLE public.gallery (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  image_url  text NOT NULL,
  sort_order integer DEFAULT 0,
  active     boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ─── Barbershop Settings (singleton row, id = 1) ──────────────
CREATE TABLE public.barbershop_settings (
  id              integer PRIMARY KEY DEFAULT 1,
  address         text NOT NULL DEFAULT '123 Main Street, New York, NY 10001',
  map_embed_url   text,
  google_maps_url text,
  hero_image_url  text,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.barbershop_settings (id, address)
VALUES (1, '123 Main Street, New York, NY 10001')
ON CONFLICT (id) DO NOTHING;

-- ─── Social Links ─────────────────────────────────────────────
CREATE TABLE public.social_links (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform   text NOT NULL,
  label      text NOT NULL,
  url        text NOT NULL,
  active     boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links       ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- appointments
CREATE POLICY "appts_select" ON public.appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "appts_insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appts_update" ON public.appointments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- audit_logs
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- notifications — admins can insert freely; clients only for their own appointments
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      appointment_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.appointments
        WHERE id = appointment_id AND user_id = auth.uid()
      )
    )
  );
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_admin());

-- services (public read — landing page + booking are unauthenticated)
CREATE POLICY "services_select" ON public.services FOR SELECT USING (true);
CREATE POLICY "services_admin"  ON public.services FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- barbers (public read)
CREATE POLICY "barbers_select" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "barbers_admin"  ON public.barbers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reviews (public read)
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_admin"  ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- gallery (public read)
CREATE POLICY "gallery_select" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "gallery_admin"  ON public.gallery FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- barbershop_settings (public read, admin write)
CREATE POLICY "settings_select" ON public.barbershop_settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON public.barbershop_settings FOR UPDATE TO authenticated
  USING (public.is_admin());

-- social_links (public read)
CREATE POLICY "social_select" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "social_admin"  ON public.social_links FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================
-- TRIGGER: auto-create profile on signup
-- =============================================================
-- All users start as 'client'. To promote the first admin after deployment run:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'client'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================================
-- STORAGE BUCKETS
-- =============================================================

-- avatars — user profile photos (path must be {userId}/filename)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload"  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_update"  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_delete"  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- gallery — gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "gallery_public_read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');
CREATE POLICY "gallery_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND public.is_admin());
CREATE POLICY "gallery_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery' AND public.is_admin());

-- barber-photos — barber profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "barber_photos_public_read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'barber-photos');
CREATE POLICY "barber_photos_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'barber-photos' AND public.is_admin());
CREATE POLICY "barber_photos_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'barber-photos' AND public.is_admin());
CREATE POLICY "barber_photos_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'barber-photos' AND public.is_admin());

-- hero-images — homepage hero banner
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hero_public_read"    ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-images');
CREATE POLICY "hero_admin_insert"   ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hero-images' AND public.is_admin());
CREATE POLICY "hero_admin_update"   ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hero-images' AND public.is_admin());
CREATE POLICY "hero_admin_delete"   ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hero-images' AND public.is_admin());
