type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

/**
 * In-process sliding-window rate limiter.
 *
 * Returns true when the request is allowed, false when the limit is exceeded.
 *
 * NOTE: state resets on cold starts. For multi-instance or serverless deployments
 * pair this with Supabase Auth → Settings → Rate Limits (or Upstash Redis).
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= max) return false
  bucket.count++
  return true
}
