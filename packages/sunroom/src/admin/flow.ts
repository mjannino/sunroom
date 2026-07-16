import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AuthConfig } from './config.js'
import { isEditor } from './config.js'
import type { GoogleIdentity } from './google.js'

export type CallbackDecision = { ok: true } | { ok: false; status: 400 | 403; reason: string }

export function checkState(returnedState: string | null, storedState: string | undefined): boolean {
  return !!returnedState && !!storedState && returnedState === storedState
}

export function authorizeIdentity(config: AuthConfig, identity: GoogleIdentity): CallbackDecision {
  if (!identity.emailVerified) {
    return { ok: false, status: 403, reason: 'Your Google email is not verified.' }
  }
  if (!isEditor(config, identity.email)) {
    return { ok: false, status: 403, reason: 'This account is not authorized to edit this site.' }
  }
  return { ok: true }
}

/**
 * Timing-safe owner-token comparison. Both sides are hashed to a fixed length
 * first, so `timingSafeEqual` never sees a length mismatch (which would both
 * throw and leak length via timing).
 */
export function checkOwnerToken(configuredToken: string | null, submitted: string | undefined): boolean {
  if (!configuredToken || !submitted) return false
  const a = createHmac('sha256', 'owner').update(configuredToken).digest()
  const b = createHmac('sha256', 'owner').update(submitted).digest()
  return timingSafeEqual(a, b)
}
