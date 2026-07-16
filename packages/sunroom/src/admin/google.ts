import 'server-only'
import * as arctic from 'arctic'
import type { AuthConfig } from './config.js'

export interface GoogleIdentity {
  email: string
  emailVerified: boolean
  name: string
}

export interface Authorization {
  url: string
  state: string
  codeVerifier: string
}

const SCOPES = ['openid', 'profile', 'email']

function client(config: AuthConfig, redirectUri: string): arctic.Google {
  return new arctic.Google(config.googleClientId, config.googleClientSecret, redirectUri)
}

export function buildAuthorization(config: AuthConfig, redirectUri: string): Authorization {
  const state = arctic.generateState()
  const codeVerifier = arctic.generateCodeVerifier()
  const url = client(config, redirectUri).createAuthorizationURL(state, codeVerifier, SCOPES)
  return { url: url.toString(), state, codeVerifier }
}

export async function exchangeCode(
  config: AuthConfig,
  redirectUri: string,
  code: string,
  codeVerifier: string,
): Promise<GoogleIdentity> {
  const tokens = await client(config, redirectUri).validateAuthorizationCode(code, codeVerifier)
  const claims = arctic.decodeIdToken(tokens.idToken()) as {
    email?: string
    email_verified?: boolean
    name?: string
  }

  if (!claims.email) {
    throw new Error('Google ID token did not contain an email address')
  }

  return {
    email: claims.email,
    emailVerified: claims.email_verified === true,
    name: claims.name ?? claims.email,
  }
}
