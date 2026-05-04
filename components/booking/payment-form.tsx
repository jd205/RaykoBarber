'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react'
import { processPayment } from '@/app/actions/payments'

// Minimal types for Square Web Payments SDK (CDN version)
type TokenResult = {
  status: 'OK' | 'Cancel' | 'Error'
  token?: string
  errors?: Array<{ message: string; field?: string }>
}

type SquareCard = {
  attach: (selector: string) => Promise<void>
  tokenize: () => Promise<TokenResult>
  destroy: () => Promise<void>
}

type SquareDigitalWallet = {
  attach: (selector: string) => Promise<void>
  tokenize: () => Promise<TokenResult>
}

type SquarePayments = {
  card: () => Promise<SquareCard>
  googlePay: (req: object) => Promise<SquareDigitalWallet>
  applePay: (req: object) => Promise<SquareDigitalWallet>
  paymentRequest: (opts: {
    countryCode: string
    currencyCode: string
    total: { amount: string; label: string }
  }) => object
}

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>
    }
  }
}

interface PaymentFormProps {
  appointmentId: string
  amountCents: number
  squareAppId: string
  squareLocationId: string
  onSuccess: () => void
  dict: {
    paymentCardLabel: string
    paymentPay: string
    paymentPaying: string
    paymentOrPayWith: string
    paymentSdkLoading: string
    paymentSuccess: string
  }
}

export function PaymentForm({ appointmentId, amountCents, squareAppId, squareLocationId, onSuccess, dict }: PaymentFormProps) {
  const cardRef = useRef<SquareCard | null>(null)
  const googlePayRef = useRef<SquareDigitalWallet | null>(null)
  const applePayRef = useRef<SquareDigitalWallet | null>(null)

  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasGooglePay, setHasGooglePay] = useState(false)
  const [hasApplePay, setHasApplePay] = useState(false)

  const amountStr = (amountCents / 100).toFixed(2)

  const handleToken = useCallback(async (token: string) => {
    setLoading(true)
    setError(null)
    const res = await processPayment(token, appointmentId)
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setSuccess(true)
    setTimeout(onSuccess, 1800)
  }, [appointmentId, onSuccess])

  // Initialize Square Web Payments SDK
  useEffect(() => {
    if (!squareAppId || !squareLocationId) { setError('Square not configured — connect Square in the admin panel'); return }
    let cancelled = false

    async function init() {
      // The SDK script is loaded by the page — poll until window.Square is ready
      let attempts = 0
      while (!window.Square && attempts < 60) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }
      if (!window.Square || cancelled) return

      try {
        const payments = await window.Square.payments(squareAppId, squareLocationId)

        // Card form
        const card = await payments.card()
        await card.attach('#sq-card-container')
        cardRef.current = card

        // Payment request for wallet buttons
        const paymentRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: { amount: amountStr, label: 'Barbershop appointment' },
        })

        // Google Pay (silent fail — not all browsers support it)
        try {
          const gp = await payments.googlePay(paymentRequest)
          await gp.attach('#sq-gpay-button')
          googlePayRef.current = gp
          if (!cancelled) setHasGooglePay(true)
        } catch { /* unavailable */ }

        // Apple Pay (silent fail — requires HTTPS + Apple device)
        try {
          const ap = await payments.applePay(paymentRequest)
          await ap.attach('#sq-applepay-button')
          applePayRef.current = ap
          if (!cancelled) setHasApplePay(true)
        } catch { /* unavailable */ }

        if (!cancelled) setSdkReady(true)
      } catch {
        if (!cancelled) setError('Failed to load payment form. Please refresh and try again.')
      }
    }

    init()
    return () => {
      cancelled = true
      cardRef.current?.destroy().catch(() => {})
    }
  }, [squareAppId, squareLocationId, amountStr])

  // Wire digital wallet click handlers after SDK is ready
  useEffect(() => {
    if (!sdkReady) return

    const gpEl = document.getElementById('sq-gpay-button')
    const apEl = document.getElementById('sq-applepay-button')

    const handleGPay = async () => {
      if (!googlePayRef.current || loading) return
      const res = await googlePayRef.current.tokenize()
      if (res.status === 'OK' && res.token) {
        await handleToken(res.token)
      } else if (res.status !== 'Cancel') {
        setError(res.errors?.[0]?.message ?? 'Google Pay failed')
      }
    }

    const handleAPay = async () => {
      if (!applePayRef.current || loading) return
      const res = await applePayRef.current.tokenize()
      if (res.status === 'OK' && res.token) {
        await handleToken(res.token)
      } else if (res.status !== 'Cancel') {
        setError(res.errors?.[0]?.message ?? 'Apple Pay failed')
      }
    }

    gpEl?.addEventListener('click', handleGPay)
    apEl?.addEventListener('click', handleAPay)
    return () => {
      gpEl?.removeEventListener('click', handleGPay)
      apEl?.removeEventListener('click', handleAPay)
    }
  }, [sdkReady, loading, handleToken])

  const handleCardPay = async () => {
    if (!cardRef.current || loading || !sdkReady) return
    setLoading(true)
    setError(null)
    try {
      const res = await cardRef.current.tokenize()
      if (res.status !== 'OK' || !res.token) {
        setError(res.errors?.[0]?.message ?? 'Card tokenization failed')
        setLoading(false)
        return
      }
      await handleToken(res.token)
    } catch {
      setError('Card payment failed. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-yellow-500" />
        </div>
        <p className="text-white font-bold text-xl">{dict.paymentSuccess}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Digital wallet buttons (only rendered when device supports them) */}
      {(hasApplePay || hasGooglePay) && (
        <>
          <div className="space-y-2">
            <div
              id="sq-applepay-button"
              className={hasApplePay ? 'w-full min-h-[44px] rounded-xl overflow-hidden cursor-pointer' : 'hidden'}
            />
            <div
              id="sq-gpay-button"
              className={hasGooglePay ? 'w-full min-h-[44px] rounded-xl overflow-hidden cursor-pointer' : 'hidden'}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-widest">{dict.paymentOrPayWith}</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </>
      )}

      {/* Card form */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" />
          {dict.paymentCardLabel}
        </p>
        <div className="bg-black/50 border border-white/10 rounded-xl p-4 min-h-[90px]">
          {!sdkReady && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              {dict.paymentSdkLoading}
            </div>
          )}
          {/* Square renders the card iframe here */}
          <div id="sq-card-container" />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-3 border border-red-500/20">
          {error}
        </p>
      )}

      <button
        onClick={handleCardPay}
        disabled={!sdkReady || loading}
        className="w-full bg-yellow-500 text-black font-bold text-lg py-4 rounded-xl hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading
          ? <><Loader2 className="w-5 h-5 animate-spin" /> {dict.paymentPaying}</>
          : <><CreditCard className="w-5 h-5" /> {dict.paymentPay} ${amountStr}</>}
      </button>

      <p className="text-center text-xs text-gray-600">Secured by Square · PCI DSS compliant</p>
    </div>
  )
}
