'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, CheckCircle2, AlertCircle, Loader2,
  Unplug, ExternalLink, RefreshCw, Clock,
} from 'lucide-react'
import {
  getSquareConnectionStatus,
  initiateSquareOAuth,
  disconnectSquare,
  type SquareConnectionStatus,
} from '@/app/actions/square-oauth'

const DISCONNECTED: SquareConnectionStatus = {
  connected: false,
  merchantName: null,
  merchantId: null,
  locationId: null,
  appId: null,
  connectedAt: null,
  tokenExpiresAt: null,
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-sm font-mono truncate">{value}</p>
    </div>
  )
}

export function SquareConnect() {
  const [status, setStatus] = useState<SquareConnectionStatus>(DISCONNECTED)
  const [loading, setLoading] = useState(true)
  const [disconnecting, startDisconnect] = useTransition()
  const [flashError, setFlashError] = useState<string | null>(null)
  const [disconnectOk, setDisconnectOk] = useState(false)

  // Read URL params set by the OAuth callback, then clean the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sq_error')) {
      setFlashError(`Square OAuth error: ${params.get('sq_error')}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('sq_connected')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    getSquareConnectionStatus().then(s => {
      setStatus(s)
      setLoading(false)
    })
  }, [])

  const handleDisconnect = () => {
    setFlashError(null)
    startDisconnect(async () => {
      const result = await disconnectSquare()
      if (result.error) { setFlashError(result.error); return }
      setStatus(DISCONNECTED)
      setDisconnectOk(true)
      setTimeout(() => setDisconnectOk(false), 3000)
    })
  }

  const daysUntilExpiry = status.tokenExpiresAt
    ? Math.floor((new Date(status.tokenExpiresAt).getTime() - Date.now()) / 86_400_000)
    : null

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-xl">
          <CreditCard className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Square Payments</h2>
          <p className="text-gray-400 text-sm">
            Connect your Square account to accept card, Apple Pay, and Google Pay payments
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status.connected ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Connected banner */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">Connected to Square</p>
                {status.merchantName && (
                  <p className="text-green-400/70 text-xs mt-0.5">{status.merchantName}</p>
                )}
              </div>
            </div>

            {/* Token expiry warning */}
            {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
              <div className="flex items-center gap-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <p className="text-orange-400 text-sm">
                  Token expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} — click Reconnect to refresh.
                </p>
              </div>
            )}

            {/* Credentials grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {status.merchantId && <InfoRow label="Merchant ID" value={status.merchantId} />}
              {status.locationId && <InfoRow label="Location ID" value={status.locationId} />}
              {status.appId && <InfoRow label="App ID" value={status.appId} />}
              {status.connectedAt && (
                <InfoRow
                  label="Connected"
                  value={new Date(status.connectedAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                />
              )}
              {status.tokenExpiresAt && (
                <InfoRow
                  label="Token expires"
                  value={new Date(status.tokenExpiresAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <form action={initiateSquareOAuth}>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Reconnect
                </button>
              </form>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
              >
                {disconnecting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Unplug className="w-4 h-4" />}
                Disconnect
              </button>
            </div>

            {disconnectOk && (
              <p className="text-green-400 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Disconnected successfully
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="text-yellow-400 text-sm">
                Not connected. Authorize Square to start accepting payments.
              </p>
            </div>

            <form action={initiateSquareOAuth}>
              <button
                type="submit"
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl transition-colors shadow-[0_0_20px_rgba(234,179,8,0.3)] text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Connect with Square
              </button>
            </form>

            <p className="text-gray-600 text-xs leading-relaxed">
              You will be redirected to Square to authorize access. Required scopes:{' '}
              <span className="font-mono text-gray-500">
                PAYMENTS_WRITE · PAYMENTS_READ · MERCHANT_PROFILE_READ · ITEMS_READ
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash error (OAuth callback errors or disconnect errors) */}
      {flashError && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm">{flashError}</p>
        </div>
      )}

      {/* Setup note */}
      <div className="border-t border-white/5 pt-4">
        <p className="text-gray-600 text-xs leading-relaxed">
          <span className="text-gray-500 font-semibold">Before connecting:</span> add{' '}
          <span className="font-mono">SQUARE_CLIENT_ID</span> and{' '}
          <span className="font-mono">SQUARE_CLIENT_SECRET</span> to your env vars, then register{' '}
          <span className="font-mono">{'{SITE_URL}'}/api/square/oauth/callback</span> as a redirect URI in
          the Square Developer Console → your app → OAuth.
        </p>
      </div>
    </div>
  )
}
