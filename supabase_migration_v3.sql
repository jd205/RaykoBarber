-- Migration V3: Add notifications table + email to profiles
-- Run this in Supabase SQL Editor (does NOT drop any existing tables or data)

-- 1. Add email column to existing profiles (if it doesn't exist yet)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill email from auth.users for all existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Set medinajd205@gmail.com as admin (for the existing account)
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'medinajd205@gmail.com'
);

-- 4. Update trigger to also save email on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_role text;
BEGIN
  IF new.email = 'medinajd205@gmail.com' THEN
    target_role := 'admin';
  ELSE
    target_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    target_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role  = EXCLUDED.role;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create notifications table (if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text NOT NULL CHECK (type IN ('new_booking', 'reschedule', 'cancellation')),
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_name     text,
  message         text NOT NULL,
  read            boolean DEFAULT false,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view notifications"           ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications"         ON public.notifications;

-- 7. Notifications RLS policies
CREATE POLICY "Admins can view notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_admin());
