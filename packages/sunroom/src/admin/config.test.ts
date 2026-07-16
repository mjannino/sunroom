import { describe, expect, it } from 'vitest'
import { AuthConfigError, callbackUrl, getAuthConfig, isEditor, parseEditors } from './config.js'

const FULL_ENV = {
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  SUNROOM_SESSION_SECRET: 'sessionsecret',
  SUNROOM_EDITORS: 'Jane@Acme.com, bob@acme.com',
  SUNROOM_URL: 'https://acme.com',
  SUNROOM_OWNER_TOKEN: 'ownertoken',
}

describe('parseEditors', () => {
  it('trims, lowercases, and drops empties', () => {
    expect([...parseEditors(' A@x.com , b@x.com ,')]).toEqual(['a@x.com', 'b@x.com'])
  })
  it('returns an empty set for undefined', () => {
    expect(parseEditors(undefined).size).toBe(0)
  })
})

describe('getAuthConfig', () => {
  it('reads a full environment', () => {
    const c = getAuthConfig(FULL_ENV)
    expect(c.googleClientId).toBe('id')
    expect(c.baseUrl).toBe('https://acme.com')
    expect(c.ownerToken).toBe('ownertoken')
    expect([...c.editors]).toEqual(['jane@acme.com', 'bob@acme.com'])
  })
  it('treats SUNROOM_URL and SUNROOM_OWNER_TOKEN as optional', () => {
    const { SUNROOM_URL, SUNROOM_OWNER_TOKEN, ...rest } = FULL_ENV
    const c = getAuthConfig(rest)
    expect(c.baseUrl).toBeNull()
    expect(c.ownerToken).toBeNull()
  })
  it('throws AuthConfigError naming every missing required var', () => {
    try {
      getAuthConfig({})
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AuthConfigError)
      const msg = (e as Error).message
      expect(msg).toContain('GOOGLE_CLIENT_ID')
      expect(msg).toContain('GOOGLE_CLIENT_SECRET')
      expect(msg).toContain('SUNROOM_SESSION_SECRET')
      expect(msg).toContain('SUNROOM_EDITORS')
    }
  })
})

describe('isEditor', () => {
  const c = getAuthConfig(FULL_ENV)
  it('matches case-insensitively and trims', () => {
    expect(isEditor(c, ' JANE@acme.com ')).toBe(true)
    expect(isEditor(c, 'bob@acme.com')).toBe(true)
  })
  it('rejects a non-listed email', () => {
    expect(isEditor(c, 'mallory@evil.com')).toBe(false)
  })
})

describe('callbackUrl', () => {
  const c = getAuthConfig(FULL_ENV)
  it('uses baseUrl when set', () => {
    expect(callbackUrl(c, 'https://ignored')).toBe('https://acme.com/api/sunroom/auth/callback')
  })
  it('falls back to the request origin when baseUrl is null', () => {
    const { SUNROOM_URL, ...rest } = FULL_ENV
    expect(callbackUrl(getAuthConfig(rest), 'https://acme.com')).toBe(
      'https://acme.com/api/sunroom/auth/callback',
    )
  })
  it('does not produce a double slash', () => {
    expect(callbackUrl(c, 'https://x/')).not.toContain('com//api')
  })
})
