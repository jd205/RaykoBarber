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
