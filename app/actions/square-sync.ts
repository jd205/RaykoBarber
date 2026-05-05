'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/require-admin'
import { getSquareClient } from '@/lib/square/client'
import { Currency } from 'square'

export type SquareSyncStatus = {
  servicesTotal: number
  servicesSynced: number
  barbersTotal: number
  barbersSynced: number
}

async function getLocationId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('square_oauth_credentials')
    .select('location_id')
    .eq('id', 1)
    .single()
  return data?.location_id ?? process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ''
}

/** Push all active services to Square catalog as APPOINTMENTS_SERVICE items. */
export async function syncSquareServices(): Promise<{ synced: number; error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { synced: 0, error: admin.error }

  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes')
    .eq('active', true)

  if (!services?.length) return { synced: 0 }

  try {
    const squareClient = await getSquareClient()

    const objects = services.map(s => ({
      type: 'ITEM' as const,
      id: `#item-${s.id}`,
      presentAtAllLocations: true,
      itemData: {
        name: s.name,
        productType: 'APPOINTMENTS_SERVICE' as const,
        variations: [
          {
            type: 'ITEM_VARIATION' as const,
            id: `#var-${s.id}`,
            itemVariationData: {
              name: 'Standard',
              pricingType: 'FIXED_PRICING' as const,
              priceMoney: {
                amount: BigInt(Math.round(Number(s.price) * 100)),
                currency: Currency.Usd,
              },
              serviceDuration: BigInt(s.duration_minutes * 60 * 1000),
            },
          },
        ],
      },
    }))

    const res = await squareClient.catalog.batchUpsert({
      idempotencyKey: crypto.randomUUID(),
      batches: [{ objects }],
    })

    // Build a version map from the response objects (CatalogObject is a union — use any for deep access)
    const objectsAny = (res.objects ?? []) as unknown as Array<{
      id: string; version?: bigint | number;
      itemData?: { variations?: Array<{ id: string; version?: bigint | number }> }
    }>

    const idMappings = res.idMappings ?? []
    let synced = 0
    for (const service of services) {
      const varKey = `#var-${service.id}`
      const mapped = idMappings.find(m => m.clientObjectId === varKey)
      if (mapped?.objectId) {
        // Find the variation version from the upserted parent item
        let version: bigint | number | null = null
        for (const obj of objectsAny) {
          const foundVar = obj.itemData?.variations?.find(v => v.id === mapped.objectId)
          if (foundVar) { version = foundVar.version ?? null; break }
        }

        await supabase
          .from('services')
          .update({
            square_catalog_variation_id: mapped.objectId,
            square_catalog_variation_version: version !== null ? Number(version) : null,
          })
          .eq('id', service.id)
        synced++
      }
    }

    return { synced }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    return { synced: 0, error: msg }
  }
}

/**
 * Fetch Square team members and auto-match to barbers by name.
 * Names must match exactly (case-insensitive).
 */
export async function syncSquareTeamMembers(): Promise<{ matched: number; total: number; error?: string }> {
  const admin = await requireAdmin()
  if ('error' in admin) return { matched: 0, total: 0, error: admin.error }

  const supabase = await createClient()
  const locationId = await getLocationId()
  if (!locationId) return { matched: 0, total: 0, error: 'Location ID not configured' }

  try {
    const squareClient = await getSquareClient()
    const res = await squareClient.teamMembers.search({
      query: {
        filter: {
          locationIds: [locationId],
          status: 'ACTIVE',
        },
      },
    })

    const teamMembers = res.teamMembers ?? []
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('active', true)

    let matched = 0
    for (const member of teamMembers) {
      const fullName = `${member.givenName ?? ''} ${member.familyName ?? ''}`.trim()
      const barber = barbers?.find(
        b => b.name.trim().toLowerCase() === fullName.toLowerCase()
      )
      if (barber && member.id) {
        await supabase
          .from('barbers')
          .update({ square_team_member_id: member.id })
          .eq('id', barber.id)
        matched++
      }
    }

    return { matched, total: teamMembers.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    return { matched: 0, total: 0, error: msg }
  }
}

/** Current sync coverage — how many barbers/services are linked to Square. */
export async function getSquareSyncStatus(): Promise<SquareSyncStatus> {
  const admin = await requireAdmin()
  if ('error' in admin) {
    return { servicesTotal: 0, servicesSynced: 0, barbersTotal: 0, barbersSynced: 0 }
  }

  const supabase = await createClient()
  const [{ data: services }, { data: barbers }] = await Promise.all([
    supabase.from('services').select('square_catalog_variation_id').eq('active', true),
    supabase.from('barbers').select('square_team_member_id').eq('active', true),
  ])

  return {
    servicesTotal: services?.length ?? 0,
    servicesSynced: services?.filter(s => s.square_catalog_variation_id).length ?? 0,
    barbersTotal: barbers?.length ?? 0,
    barbersSynced: barbers?.filter(b => b.square_team_member_id).length ?? 0,
  }
}

export type SquareDiagnostic = {
  tokenWorking: boolean
  locationId: string
  barbers: Array<{ id: string; name: string; teamMemberId: string | null }>
  services: Array<{ id: string; name: string; catalogId: string | null; hasVersion: boolean }>
  squareTeamMembers: Array<{ id: string; name: string }>
  tokenError?: string
}

/** Full diagnostic: token validity, per-barber/service status, available Square team members. */
export async function getSquareDiagnostics(): Promise<SquareDiagnostic> {
  const admin = await requireAdmin()
  const empty: SquareDiagnostic = {
    tokenWorking: false, locationId: '', barbers: [], services: [], squareTeamMembers: [],
  }
  if ('error' in admin) return empty

  const supabase = await createClient()
  const locationId = await getLocationId()

  const [{ data: barbers }, { data: services }] = await Promise.all([
    supabase.from('barbers').select('id, name, square_team_member_id').eq('active', true),
    supabase.from('services').select('id, name, square_catalog_variation_id, square_catalog_variation_version').eq('active', true),
  ])

  let tokenWorking = false
  let squareTeamMembers: Array<{ id: string; name: string }> = []
  let tokenError: string | undefined

  try {
    const squareClient = await getSquareClient()
    const res = await squareClient.teamMembers.search({
      query: { filter: { locationIds: [locationId || 'NONE'], status: 'ACTIVE' } },
    })
    tokenWorking = true
    squareTeamMembers = (res.teamMembers ?? []).map(m => ({
      id: m.id ?? '',
      name: `${m.givenName ?? ''} ${m.familyName ?? ''}`.trim(),
    }))
  } catch (err) {
    tokenError = err instanceof Error ? err.message : 'Square API call failed'
  }

  return {
    tokenWorking,
    locationId,
    barbers: (barbers ?? []).map(b => ({
      id: b.id,
      name: b.name,
      teamMemberId: (b as { square_team_member_id?: string }).square_team_member_id ?? null,
    })),
    services: (services ?? []).map(s => {
      const sAny = s as { square_catalog_variation_id?: string; square_catalog_variation_version?: number }
      return {
        id: s.id,
        name: s.name,
        catalogId: sAny.square_catalog_variation_id ?? null,
        hasVersion: sAny.square_catalog_variation_version != null,
      }
    }),
    squareTeamMembers,
    tokenError,
  }
}

/** Retry Square Bookings sync for all scheduled appointments that were never sent to Square. */
export async function retryUnsyncedAppointments(): Promise<{
  attempted: number; synced: number; errors: string[]
}> {
  const admin = await requireAdmin()
  if ('error' in admin) return { attempted: 0, synced: 0, errors: [admin.error] }

  const supabase = await createClient()
  const locationId = await getLocationId()
  if (!locationId) return { attempted: 0, synced: 0, errors: ['Location ID not configured'] }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, service_id, barber_id, appointment_date')
    .eq('status', 'scheduled')
    .is('square_booking_id', null)
    .order('appointment_date', { ascending: false })
    .limit(50)

  if (!appointments?.length) return { attempted: 0, synced: 0, errors: [] }

  const squareClient = await getSquareClient()
  let synced = 0
  const errors: string[] = []

  for (const appt of appointments) {
    try {
      const [{ data: barberSq }, { data: serviceSq }] = await Promise.all([
        supabase.from('barbers').select('square_team_member_id').eq('id', appt.barber_id).single(),
        supabase.from('services').select('square_catalog_variation_id, square_catalog_variation_version, duration_minutes').eq('id', appt.service_id).single(),
      ])

      const teamMemberId = (barberSq as { square_team_member_id?: string } | null)?.square_team_member_id
      const variationId = (serviceSq as { square_catalog_variation_id?: string } | null)?.square_catalog_variation_id
      const variationVersion = (serviceSq as { square_catalog_variation_version?: number } | null)?.square_catalog_variation_version
      const durationMinutes = (serviceSq as { duration_minutes?: number } | null)?.duration_minutes ?? 30

      if (!teamMemberId || !variationId || !variationVersion) {
        errors.push(`Appt ${appt.id.slice(0, 8)}: missing ${!teamMemberId ? 'team member' : !variationId ? 'catalog ID' : 'catalog version'}`)
        continue
      }

      const bookingRes = await squareClient.bookings.create({
        idempotencyKey: appt.id,
        booking: {
          startAt: appt.appointment_date,
          locationId,
          appointmentSegments: [{
            durationMinutes,
            serviceVariationId: variationId,
            teamMemberId,
            serviceVariationVersion: BigInt(variationVersion),
          }],
        },
      })

      const squareBookingId = bookingRes.booking?.id
      if (squareBookingId) {
        await supabase.from('appointments').update({ square_booking_id: squareBookingId }).eq('id', appt.id)
        synced++
      }
    } catch (err) {
      errors.push(`Appt ${appt.id.slice(0, 8)}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return { attempted: appointments.length, synced, errors }
}
