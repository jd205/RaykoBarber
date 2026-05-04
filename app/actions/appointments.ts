'use server'

import { createClient } from '@/lib/supabase/server'
import { getSquareClient } from '@/lib/square/client'
import { z } from 'zod'

const MAX_DAYS_AHEAD = 30

function isValidFutureDate(dateStr: string): boolean {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const max = new Date()
  max.setDate(max.getDate() + MAX_DAYS_AHEAD)
  return d > now && d <= max
}

const bookSchema = z.object({
  serviceId: z.string().uuid(),
  barberId: z.string().uuid(),
  appointmentDate: z.string().refine(isValidFutureDate, {
    message: `Appointment must be in the future and within ${MAX_DAYS_AHEAD} days`,
  }),
  paymentMethod: z.enum(['card', 'cash']).default('card'),
})

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  newDate: z.string().refine(isValidFutureDate, {
    message: `Appointment must be in the future and within ${MAX_DAYS_AHEAD} days`,
  }),
})

const cancelSchema = z.object({
  appointmentId: z.string().uuid(),
})

export async function bookAppointment(
  serviceId: string,
  barberId: string,
  appointmentDate: string,
  paymentMethod: 'card' | 'cash' = 'card'
): Promise<{ error?: string; appointmentId?: string }> {
  const parsed = bookSchema.safeParse({ serviceId, barberId, appointmentDate, paymentMethod })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const clientName = profile?.full_name || user.email || 'Client'

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      user_id: user.id,
      service_id: parsed.data.serviceId,
      barber_id: parsed.data.barberId,
      appointment_date: parsed.data.appointmentDate,
      status: 'scheduled',
      payment_method: parsed.data.paymentMethod,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'SLOT_OCCUPIED' }
    return { error: error.message }
  }

  const [{ data: service }, { data: barber }] = await Promise.all([
    supabase.from('services').select('name').eq('id', parsed.data.serviceId).single(),
    supabase.from('barbers').select('name').eq('id', parsed.data.barberId).single(),
  ])
  const serviceName = (service as { name?: string } | null)?.name || parsed.data.serviceId
  const barberName = (barber as { name?: string } | null)?.name || parsed.data.barberId
  const dateFormatted = new Date(parsed.data.appointmentDate).toLocaleString()

  const payLabel = parsed.data.paymentMethod === 'cash' ? 'Pay in person (cash)' : 'Pay by card'
  try {
    await supabase.from('notifications').insert({
      type: 'new_booking',
      appointment_id: appointment.id,
      client_name: clientName,
      message: `${clientName} booked ${serviceName} with ${barberName} on ${dateFormatted} · ${payLabel}`,
    })
  } catch { /* notification failure must not block booking */ }

  // Attempt to sync to Square Bookings (non-blocking — missing IDs = silent skip)
  try {
    const [{ data: barberSq }, { data: serviceSq }, { data: creds }] = await Promise.all([
      supabase.from('barbers').select('square_team_member_id').eq('id', parsed.data.barberId).single(),
      supabase.from('services').select('square_catalog_variation_id, square_catalog_variation_version, duration_minutes').eq('id', parsed.data.serviceId).single(),
      supabase.from('square_oauth_credentials').select('location_id').eq('id', 1).single(),
    ])

    const teamMemberId = (barberSq as { square_team_member_id?: string } | null)?.square_team_member_id
    const variationId = (serviceSq as { square_catalog_variation_id?: string } | null)?.square_catalog_variation_id
    const variationVersion = (serviceSq as { square_catalog_variation_version?: number } | null)?.square_catalog_variation_version
    const durationMinutes = (serviceSq as { duration_minutes?: number } | null)?.duration_minutes ?? 30
    const locationId = (creds as { location_id?: string } | null)?.location_id
      ?? process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ''

    if (teamMemberId && variationId && variationVersion && locationId) {
      const squareClient = await getSquareClient()
      const bookingRes = await squareClient.bookings.create({
        idempotencyKey: appointment.id,
        booking: {
          startAt: parsed.data.appointmentDate,
          locationId,
          appointmentSegments: [
            {
              durationMinutes,
              serviceVariationId: variationId,
              teamMemberId,
              serviceVariationVersion: BigInt(variationVersion),
            },
          ],
        },
      })
      const squareBookingId = bookingRes.booking?.id
      if (squareBookingId) {
        await supabase
          .from('appointments')
          .update({ square_booking_id: squareBookingId })
          .eq('id', appointment.id)
      }
    }
  } catch { /* Square sync failure must not block the booking */ }

  return { appointmentId: appointment.id }
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string
): Promise<{ error?: string }> {
  const parsed = rescheduleSchema.safeParse({ appointmentId, newDate })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch with ownership filter to prevent data disclosure
  const { data: appt } = await supabase
    .from('appointments')
    .select('service_id, barber_id, profiles(full_name)')
    .eq('id', parsed.data.appointmentId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('appointments')
    .update({ appointment_date: parsed.data.newDate, status: 'scheduled' })
    .eq('id', parsed.data.appointmentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const profile = appt?.profiles as { full_name?: string } | null
  const clientName = profile?.full_name || 'Client'
  const { data: service } = await supabase.from('services').select('name').eq('id', appt?.service_id || '').single()
  const serviceName = (service as { name?: string } | null)?.name || appt?.service_id || ''
  const dateFormatted = new Date(parsed.data.newDate).toLocaleString()

  try {
    await supabase.from('notifications').insert({
      type: 'reschedule',
      appointment_id: parsed.data.appointmentId,
      client_name: clientName,
      message: `${clientName} rescheduled ${serviceName} to ${dateFormatted}`,
    })
  } catch { /* notification failure must not block booking */ }

  return {}
}

export async function getBarberBookedSlots(
  barberId: string,
  slotISOs: string[]
): Promise<string[]> {
  if (!barberId || slotISOs.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_barber_booked_slots', {
    p_barber_id: barberId,
    p_slots: slotISOs,
  })
  if (error || !data) return []
  return (data as string[]).map((d: string) => new Date(d).toISOString())
}

export async function cancelAppointment(
  appointmentId: string
): Promise<{ error?: string }> {
  const parsed = cancelSchema.safeParse({ appointmentId })
  if (!parsed.success) return { error: 'Invalid appointment ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appt } = await supabase
    .from('appointments')
    .select('service_id, profiles(full_name)')
    .eq('id', parsed.data.appointmentId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', parsed.data.appointmentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  const profile = appt?.profiles as { full_name?: string } | null
  const clientName = profile?.full_name || 'Client'
  const { data: service } = await supabase.from('services').select('name').eq('id', appt?.service_id || '').single()
  const serviceName = (service as { name?: string } | null)?.name || appt?.service_id || ''

  try {
    await supabase.from('notifications').insert({
      type: 'cancellation',
      appointment_id: parsed.data.appointmentId,
      client_name: clientName,
      message: `${clientName} cancelled their ${serviceName} appointment`,
    })
  } catch { /* notification failure must not block booking */ }

  return {}
}
