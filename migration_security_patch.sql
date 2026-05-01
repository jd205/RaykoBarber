-- =============================================================
-- Security Patch — Run on the LIVE Supabase DB (SQL Editor)
-- Safe to run on production data — no destructive operations.
-- =============================================================

-- [F-30] Add missing 'attended' column to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS attended boolean;

-- [F-11] Fix notifications INSERT policy — was WITH CHECK (true)
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
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

-- [F-10] Fix avatar storage — restrict upload to user's own folder
DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete"  ON storage.objects;

CREATE POLICY "avatars_auth_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- [F-13] Fix trigger — remove hardcoded admin email, always assign 'client'
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

-- Ensure the barber-photos bucket exists with admin-only write policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "barber_photos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "barber_photos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "barber_photos_admin_delete" ON storage.objects;

CREATE POLICY "barber_photos_public_read"  ON storage.objects FOR SELECT
  USING (bucket_id = 'barber-photos');
CREATE POLICY "barber_photos_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'barber-photos' AND public.is_admin());
CREATE POLICY "barber_photos_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'barber-photos' AND public.is_admin());
CREATE POLICY "barber_photos_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'barber-photos' AND public.is_admin());
