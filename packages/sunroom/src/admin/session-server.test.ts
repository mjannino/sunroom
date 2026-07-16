import { describe, expect, it, vi } from 'vitest'

const store = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => store.get(name) }),
}))

import { getAuthConfig } from './config.js'
import { newSession, signSession, SESSION_COOKIE } from './session.js'
import { getSession } from './session-server.js'

const ENV = {
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  SUNROOM_SESSION_SECRET: 'sessionsecret',
  SUNROOM_EDITORS: 'jane@acme.com',
}

describe('getSession', () => {
  it('returns the identity for a valid cookie', async () => {
    // getSession reads process.env; set the same secret it will use.
    for (const [k, v] of Object.entries(ENV)) process.env[k] = v
    const token = signSession(newSession('jane@acme.com', 'Jane'), 'sessionsecret')
    store.set(SESSION_COOKIE, { value: token })
    expect(await getSession()).toEqual({ email: 'jane@acme.com', name: 'Jane' })
  })

  it('returns null when there is no cookie', async () => {
    store.clear()
    for (const [k, v] of Object.entries(ENV)) process.env[k] = v
    expect(await getSession()).toBeNull()
  })
})
