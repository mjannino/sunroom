export interface AuthConfig {
  googleClientId: string
  googleClientSecret: string
  sessionSecret: string
  /** Normalised: trimmed + lowercased emails. */
  editors: Set<string>
  /** SUNROOM_URL, or null to fall back to the request origin. */
  baseUrl: string | null
  /** Break-glass token, or null when the owner route is disabled. */
  ownerToken: string | null
}

export class AuthConfigError extends Error {
  constructor(missing: string[]) {
    super(`Sunroom auth is misconfigured. Missing required environment variables: ${missing.join(', ')}`)
    this.name = 'AuthConfigError'
  }
}

export function parseEditors(raw: string | undefined): Set<string> {
  const set = new Set<string>()
  if (!raw) return set
  for (const part of raw.split(',')) {
    const email = part.trim().toLowerCase()
    if (email) set.add(email)
  }
  return set
}

export function isEditor(config: AuthConfig, email: string): boolean {
  return config.editors.has(email.trim().toLowerCase())
}

export function getAuthConfig(env?: Partial<NodeJS.ProcessEnv>): AuthConfig {
  env = env ?? process.env
  const missing: string[] = []
  const require = (key: string): string => {
    const value = env![key]
    if (!value) missing.push(key)
    return value ?? ''
  }

  const googleClientId = require('GOOGLE_CLIENT_ID')
  const googleClientSecret = require('GOOGLE_CLIENT_SECRET')
  const sessionSecret = require('SUNROOM_SESSION_SECRET')
  const editorsRaw = require('SUNROOM_EDITORS')

  if (missing.length > 0) throw new AuthConfigError(missing)

  return {
    googleClientId,
    googleClientSecret,
    sessionSecret,
    editors: parseEditors(editorsRaw),
    baseUrl: env.SUNROOM_URL ? env.SUNROOM_URL.replace(/\/$/, '') : null,
    ownerToken: env.SUNROOM_OWNER_TOKEN || null,
  }
}

export function callbackUrl(config: AuthConfig, requestOrigin: string): string {
  const base = (config.baseUrl ?? requestOrigin).replace(/\/$/, '')
  return `${base}/api/sunroom/auth/callback`
}
