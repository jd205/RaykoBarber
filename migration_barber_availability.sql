-- ─── Barber Availability: prevent double-booking ────────────────────────────
-- Run this in the Supabase SQL editor.
-- Safe to re-run: drops previous versions before recreating.

-- Remove any previously created versions (different signatures)
DROP FUNCTION IF EXISTS public.get_barber_booked_slots(uuid, timestamptz[]);
DROP FUNCTION IF EXISTS public.get_barber_booked_slots(text, timestamptz[]);
DROP FUNCTION IF EXISTS public.get_barber_booked_slots(text, text[]);

-- 1. Unique partial index — prevents two scheduled appointments for the same
--    barber at the same time. Cancelled/completed slots can be rebooked.
CREATE UNIQUE INDEX IF NOT EXISTS unique_barber_scheduled_slot
  ON public.appointments(barber_id, appointment_date)
  WHERE status = 'scheduled';

-- 2. RPC helper — all parameters and return values use text to avoid type
--    mismatch errors regardless of how columns are typed in the real DB.
--    SECURITY DEFINER lets unauthenticated users check availability without
--    exposing any personal data.
CREATE FUNCTION public.get_barber_booked_slots(
  p_barber_id text,
  p_slots     text[]
)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    ARRAY_AGG(appointment_date::text ORDER BY appointment_date),
    ARRAY[]::text[]
  )
  FROM public.appointments
  WHERE barber_id::text = p_barber_id
    AND status = 'scheduled'
    AND appointment_date = ANY(
      ARRAY(SELECT unnest(p_slots)::timestamptz)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_barber_booked_slots(text, text[])
  TO anon, authenticated;
