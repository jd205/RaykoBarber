'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { z } from 'zod'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function sendEmailReminder(
  appointmentId: string
): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.string().uuid().safeParse(appointmentId)
  if (!parsed.success) return { error: 'Invalid appointment ID' }

  if (!process.env.RESEND_API_KEY) {
    return { error: 'RESEND_API_KEY not configured in .env.local' }
  }

  const supabase = await createClient()

  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .select('*, profiles(full_name, email), services(name), barbers(name)')
    .eq('id', parsed.data)
    .single()

  if (apptError || !appt) return { error: 'Appointment not found' }

  const profile = appt.profiles as { full_name?: string; email?: string } | null
  const clientEmail = profile?.email
  const clientName = escapeHtml(profile?.full_name || 'Valued Client')

  if (!clientEmail) return { error: 'Client email not found' }

  const serviceName = escapeHtml((appt.services as { name?: string } | null)?.name || appt.service_id)
  const barberName = escapeHtml((appt.barbers as { name?: string } | null)?.name || appt.barber_id)
  const apptDate = new Date(appt.appointment_date)
  const dateStr = escapeHtml(apptDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }))
  const timeStr = escapeHtml(apptDate.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  }))

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: 'Reyko Nakao Barbershop <onboarding@resend.dev>',
    to: clientEmail,
    subject: `Reminder: Your appointment on ${dateStr}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #fbbf24; margin-bottom: 8px;">Reyko Nakao Barbershop</h1>
        <p style="color: #9ca3af; margin-bottom: 32px;">Premium Grooming Experience</p>

        <h2 style="color: #fff; margin-bottom: 24px;">Appointment Reminder</h2>

        <p style="color: #d1d5db; margin-bottom: 24px;">
          Hi <strong style="color: #fff;">${clientName}</strong>, this is a reminder for your upcoming appointment.
        </p>

        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
          <div style="margin-bottom: 16px;">
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Service</span>
            <p style="color: #fff; font-weight: bold; font-size: 18px; margin: 4px 0 0;">${serviceName}</p>
          </div>
          <div style="margin-bottom: 16px;">
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Barber</span>
            <p style="color: #fff; font-weight: bold; margin: 4px 0 0;">${barberName}</p>
          </div>
          <div style="margin-bottom: 16px;">
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</span>
            <p style="color: #fbbf24; font-weight: bold; margin: 4px 0 0;">${dateStr}</p>
          </div>
          <div>
            <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Time</span>
            <p style="color: #fbbf24; font-weight: bold; margin: 4px 0 0;">${timeStr}</p>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you need to reschedule or cancel, please log in to your dashboard.
        </p>
      </div>
    `,
  })

  if (error) return { error: error.message }
  return { success: true }
}
