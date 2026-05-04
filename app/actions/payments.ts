'use server'

import { createClient } from '@/lib/supabase/server'
import { getSquareClient } from '@/lib/square/client'
import { SquareError } from 'square'
import { z } from 'zod'

const processSchema = z.object({
  token: z.string().min(1),
  appointmentId: z.string().uuid(),
})

export async function processPayment(
  token: string,
  appointmentId: string,
): Promise<{ error?: string; paymentId?: string }> {
  const parsed = processSchema.safeParse({ token, appointmentId })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership and fetch appointment
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, user_id, payment_status, service_id')
    .eq('id', parsed.data.appointmentId)
    .eq('user_id', user.id)
    .single()

  if (!appt) return { error: 'Appointment not found' }
  if (appt.payment_status === 'paid') return { error: 'Already paid' }

  // Fetch service price from DB — never trust client-provided amount
  const { data: service } = await supabase
    .from('services')
    .select('price')
    .eq('id', appt.service_id)
    .single()

  if (!service) return { error: 'Service not found' }

  const amountCents = Math.round(Number(service.price) * 100)
  if (amountCents < 1) return { error: 'Invalid service price' }

  // Read location_id from DB; fall back to env var for backwards compatibility
  const { data: creds } = await supabase
    .from('square_oauth_credentials')
    .select('location_id')
    .eq('id', 1)
    .single()

  const locationId = creds?.location_id ?? process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ''
  if (!locationId) return { error: 'Payment not configured — connect Square in the admin panel' }

  try {
    const squareClient = await getSquareClient()
    const { payment } = await squareClient.payments.create({
      sourceId: parsed.data.token,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      locationId,
    })

    if (!payment?.id) return { error: 'Payment failed — no confirmation received' }

    // Persist payment record
    const { error: dbError } = await supabase.from('payments').insert({
      appointment_id: appt.id,
      user_id: user.id,
      square_payment_id: payment.id,
      amount_cents: amountCents,
      currency: 'USD',
      status: payment.status === 'COMPLETED' ? 'completed' : 'pending',
      payment_method: payment.sourceType ?? null,
      card_brand: (payment as Record<string, unknown> & { cardDetails?: { card?: { cardBrand?: string } } }).cardDetails?.card?.cardBrand ?? null,
      card_last4: (payment as Record<string, unknown> & { cardDetails?: { card?: { last4?: string } } }).cardDetails?.card?.last4 ?? null,
    })

    if (dbError) {
      console.error('[payments] Failed to record payment in DB:', dbError.message)
    }

    await supabase
      .from('appointments')
      .update({ payment_status: 'paid' })
      .eq('id', appt.id)

    return { paymentId: payment.id }
  } catch (err) {
    if (err instanceof SquareError) {
      const detail = err.errors?.[0]?.detail ?? err.message
      return { error: detail }
    }
    return { error: 'Payment processing error. Please try again.' }
  }
}
