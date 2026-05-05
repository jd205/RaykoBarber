'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, CheckCircle2, AlertCircle, Loader2,
  Unplug, ExternalLink, RefreshCw, Clock, CalendarCheck, Users, Scissors,
  ChevronDown, ChevronUp, Wifi, WifiOff, RotateCcw,
} from 'lucide-react'
import {
  getSquareConnectionStatus,
  initiateSquareOAuth,
  disconnectSquare,
  type SquareConnectionStatus,
} from '@/app/actions/square-oauth'
import {
  syncSquareServices,
  syncSquareTeamMembers,
  getSquareSyncStatus,
  getSquareDiagnostics,
  retryUnsyncedAppointments,
  type SquareSyncStatus,
  type SquareDiagnostic,
} from '@/app/actions/square-sync'

const DISCONNECTED: SquareConnectionStatus = {
  connected: false,
  merchantName: null,
  merchantId: null,
  locationId: null,
  appId: null,
  connectedAt: null,
  tokenExpiresAt: null,
}

const SYNC_ZERO: SquareSyncStatus = {
  servicesTotal: 0, servicesSynced: 0, barbersTotal: 0, barbersSynced: 0,
}

const DIAG_EMPTY: SquareDiagnostic = {
  tokenWorking: false, locationId: '', barbers: [], services: [], squareTeamMembers: [],
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
  const [syncStatus, setSyncStatus] = useState<SquareSyncStatus>(SYNC_ZERO)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [diag, setDiag] = useState<SquareDiagnostic>(DIAG_EMPTY)
  const [showDiag, setShowDiag] = useState(false)
  const [loadingDiag, setLoadingDiag] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<string | null>(null)

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
    Promise.all([getSquareConnectionStatus(), getSquareSyncStatus()]).then(([s, sync]) => {
      setStatus(s)
      setSyncStatus(sync)
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

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    const [svcRes, tmRes] = await Promise.all([syncSquareServices(), syncSquareTeamMembers()])
    const [fresh, freshDiag] = await Promise.all([getSquareSyncStatus(), getSquareDiagnostics()])
    setSyncStatus(fresh)
    setDiag(freshDiag)
    setSyncing(false)
    if (svcRes.error || tmRes.error) {
      setSyncResult(`Error: ${svcRes.error ?? tmRes.error}`)
    } else {
      setSyncResult(`Synced ${svcRes.synced} services · Matched ${tmRes.matched}/${tmRes.total} team members`)
    }
  }

  const handleLoadDiag = async () => {
    setLoadingDiag(true)
    const d = await getSquareDiagnostics()
    setDiag(d)
    setShowDiag(true)
    setLoadingDiag(false)
  }

  const handleRetry = async () => {
    setRetrying(true)
    setRetryResult(null)
    const res = await retryUnsyncedAppointments()
    setRetrying(false)
    if (res.errors.length && !res.synced) {
      setRetryResult(`Error: ${res.errors[0]}`)
    } else {
      const msg = `Sent ${res.synced}/${res.attempted} appointments to Square`
      setRetryResult(res.errors.length ? `${msg} · ${res.errors.length} skipped` : msg)
    }
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

      {/* Square Appointments Sync */}
      {status.connected && (
        <div className="border-t border-white/5 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-bold text-white">Square Appointments Sync</h3>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">
            Sync your services and barbers to Square so new bookings appear automatically in the Square Appointments calendar.
          </p>

          {/* Sync status bars */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Scissors className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Services</span>
              </div>
              <p className="text-white font-bold text-lg">
                {syncStatus.servicesSynced}
                <span className="text-gray-500 font-normal text-sm"> / {syncStatus.servicesTotal}</span>
              </p>
              <p className="text-gray-600 text-xs mt-0.5">synced to Square catalog</p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Barbers</span>
              </div>
              <p className="text-white font-bold text-lg">
                {syncStatus.barbersSynced}
                <span className="text-gray-500 font-normal text-sm"> / {syncStatus.barbersTotal}</span>
              </p>
              <p className="text-gray-600 text-xs mt-0.5">matched to team members</p>
            </div>
          </div>

          {syncStatus.barbersSynced < syncStatus.barbersTotal && (
            <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/15 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400/80 text-xs leading-relaxed">
                Barbers not matched: make sure their names in Square Team match the names in your Barbers list exactly, then click Sync.
              </p>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            {syncing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
              : <><RefreshCw className="w-4 h-4" /> Sync Now</>}
          </button>

          {syncResult && (
            <p className={`text-xs flex items-center gap-1.5 ${syncResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {syncResult.startsWith('Error')
                ? <AlertCircle className="w-3.5 h-3.5" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              {syncResult}
            </p>
          )}

          {/* Retry unsynced appointments */}
          <div className="border-t border-white/5 pt-4 space-y-2">
            <p className="text-gray-500 text-xs">
              Appointments created before syncing won&apos;t appear in Square. Use this to send them now.
            </p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
            >
              {retrying
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><RotateCcw className="w-4 h-4" /> Retry Unsynced Appointments</>}
            </button>
            {retryResult && (
              <p className={`text-xs flex items-center gap-1.5 ${retryResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {retryResult.startsWith('Error') ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {retryResult}
              </p>
            )}
          </div>

          {/* Diagnostic panel */}
          <div className="border-t border-white/5 pt-4">
            <button
              onClick={showDiag ? () => setShowDiag(false) : handleLoadDiag}
              disabled={loadingDiag}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-xs transition-colors"
            >
              {loadingDiag
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : showDiag ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDiag ? 'Hide diagnostics' : 'Show diagnostics'}
            </button>

            {showDiag && (
              <div className="mt-3 space-y-3">
                {/* Token status */}
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${diag.tokenWorking ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {diag.tokenWorking
                    ? <><Wifi className="w-3.5 h-3.5" /> Access token OK · Location: {diag.locationId || 'not set'}</>
                    : <><WifiOff className="w-3.5 h-3.5" /> Token error: {diag.tokenError}</>}
                </div>

                {/* Barbers */}
                <div className="space-y-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Barbers (your app)</p>
                  {diag.barbers.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs">
                      {b.teamMemberId
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      <span className={b.teamMemberId ? 'text-gray-300' : 'text-red-300'}>{b.name}</span>
                      {!b.teamMemberId && <span className="text-gray-600">— not matched</span>}
                    </div>
                  ))}
                </div>

                {/* Square team members */}
                {diag.squareTeamMembers.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Team members in Square</p>
                    {diag.squareTeamMembers.map(m => (
                      <div key={m.id} className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
                        {m.name}
                      </div>
                    ))}
                  </div>
                ) : diag.tokenWorking ? (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 text-xs text-orange-400">
                    No team members found in Square for this location.<br />
                    Go to <span className="font-semibold">Square Dashboard → Team</span>, add your barbers there with the <span className="font-semibold">exact same names</span> as in this app, then click Sync Now.
                  </div>
                ) : null}

                {/* Services */}
                <div className="space-y-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Services (catalog sync)</p>
                  {diag.services.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      {s.catalogId && s.hasVersion
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      <span className={s.catalogId ? 'text-gray-300' : 'text-red-300'}>{s.name}</span>
                      {!s.catalogId && <span className="text-gray-600">— click Sync Now</span>}
                      {s.catalogId && !s.hasVersion && <span className="text-yellow-500">— missing version, re-sync</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
