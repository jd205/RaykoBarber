'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { z } from 'zod'

export async function toggleUserRole(
  targetUserId: string,
  newRole: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    targetUserId: z.string().uuid(),
    newRole: z.enum(['admin', 'client']),
  }).safeParse({ targetUserId, newRole })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: parsed.data.newRole })
    .eq('id', parsed.data.targetUserId)

  if (error) return { error: error.message }

  await supabase.from('audit_logs').insert({
    executor_id: admin.userId,
    action: `Changed role to ${parsed.data.newRole}`,
    target_user: parsed.data.targetUserId,
  })

  return {}
}

export async function updateAppointmentNote(
  appointmentId: string,
  note: string,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    appointmentId: z.string().uuid(),
    note: z.string().max(1000),
  }).safeParse({ appointmentId, note })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ notes: parsed.data.note || null })
    .eq('id', parsed.data.appointmentId)

  if (error) return { error: error.message }
  return {}
}

export async function updateAttendance(
  appointmentId: string,
  attended: boolean | null,
): Promise<{ error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { error: admin.error }

  const parsed = z.object({
    appointmentId: z.string().uuid(),
    attended: z.boolean().nullable(),
  }).safeParse({ appointmentId, attended })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ attended: parsed.data.attended })
    .eq('id', parsed.data.appointmentId)

  if (error) return { error: error.message }
  return {}
}
