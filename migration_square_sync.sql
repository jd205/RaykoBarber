-- Migration: Square Bookings sync columns
-- Run this in Supabase Dashboard → SQL Editor

-- Link barbers to Square team members
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS square_team_member_id text;

-- Link services to Square catalog variations
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS square_catalog_variation_id text,
  ADD COLUMN IF NOT EXISTS square_catalog_variation_version bigint;

-- Store Square booking ID on appointments (for bi-directional reference)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS square_booking_id text;
