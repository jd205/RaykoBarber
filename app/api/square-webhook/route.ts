import { NextRequest, NextResponse } from 'next/server'
import { WebhooksHelper } from 'square'
import { createClient } from '@/lib/supabase/server'

// Square sends a POST with JSON body and an HMAC-SHA256 signature header.
// We verify the signature before processing any event.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature') ?? ''
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ''
  const notificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/square-webhook`

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader,
    signatureKey,
    notificationUrl,
  })

  if (!isValid) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(body)
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const type = event.type as string
  const data = event.data as Record<string, unknown>

  // Handle payment status changes
  if (type === 'payment.updated' || type === 'payment.completed') {
    const paymentObj = (data?.object as Record<string, unknown>)?.payment as Record<string, unknown> | undefined
    if (paymentObj?.id && paymentObj?.status) {
      const squarePaymentId = paymentObj.id as string
      const status = (paymentObj.status as string).toLowerCase()

      const statusMap: Record<string, string> = {
        completed: 'completed',
        failed: 'failed',
        canceled: 'failed',
      }
      const mappedStatus = statusMap[status]
      if (mappedStatus) {
        const supabase = await createClient()
        await supabase
          .from('payments')
          .update({ status: mappedStatus, updated_at: new Date().toISOString() })
          .eq('square_payment_id', squarePaymentId)
      }
    }
  }

  if (type === 'refund.updated' || type === 'refund.completed') {
    const refundObj = (data?.object as Record<string, unknown>)?.refund as Record<string, unknown> | undefined
    if (refundObj?.payment_id) {
      const squarePaymentId = refundObj.payment_id as string
      const supabase = await createClient()
      await supabase
        .from('payments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('square_payment_id', squarePaymentId)
      // Also update appointment payment_status
      const { data: payment } = await supabase
        .from('payments')
        .select('appointment_id')
        .eq('square_payment_id', squarePaymentId)
        .single()
      if (payment?.appointment_id) {
        await supabase
          .from('appointments')
          .update({ payment_status: 'refunded' })
          .eq('id', payment.appointment_id)
      }
    }
  }

  return new NextResponse('OK', { status: 200 })
}
