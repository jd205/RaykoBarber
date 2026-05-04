-- Migration: add payment_method to appointments
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card'
  CHECK (payment_method IN ('card', 'cash'));

COMMENT ON COLUMN public.appointments.payment_method IS
  'card = paid via Square (step 5 of booking); cash = pay in person at barbershop';
